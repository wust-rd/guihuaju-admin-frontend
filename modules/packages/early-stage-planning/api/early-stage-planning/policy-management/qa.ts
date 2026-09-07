/**
 * 市住更局 —— 政策问答助手 接口层(kd_server /api/v1/chat/stream)
 *
 * 页面强制流式输出(SSE):defHttp 不支持流式读取,故用原生 fetch + 手工解析
 * event/data 帧(与 kd_server static/index.html 原型一致),回调逐段输出。
 * 响应中的引用(citations)附带政策文档(document),统一经 mapPolicy 映射为前端实体。
 */

import type { Policy } from './policy';
import { POLICY_API, mapPolicy } from './policy';

/** 问答引用(片段 + 所属政策) */
export interface ChatCitation {
  index?: number;
  snippet?: string;
  score?: number;
  policy: Policy;
}

/** 问答结果 */
export interface ChatResult {
  conversationId?: string;
  answer: string;
  citations: ChatCitation[];
}

/** 问答请求参数 */
export interface ChatPayload {
  message: string;
  conversationId?: string;
  topK?: number;
}

function mapCitation(item: Recordable): ChatCitation {
  // chat 引用的政策在 document 字段(与 policy 行同结构)
  return {
    index: item.index,
    snippet: item.snippet,
    score: item.score,
    policy: mapPolicy(item.document || {}),
  };
}

function mapCitations(list: Recordable[] | undefined): ChatCitation[] {
  return (list || []).map(mapCitation);
}

/** 流式问答流事件回调 */
export interface ChatStreamHandlers {
  /** 拿到会话 ID */
  onMeta?: (conversationId: string) => void;
  /** 拿到引用(通常先于正文输出) */
  onCitations?: (citations: ChatCitation[]) => void;
  /** 正文增量 */
  onDelta?: (text: string) => void;
}

/**
 * 流式问答:POST /api/v1/chat/stream(SSE,event 依次为 meta/citations/delta/done)。
 * 返回最终答案与引用(与回调内容一致,便于统一收尾)。
 */
export async function chatStream(payload: ChatPayload, handlers: ChatStreamHandlers): Promise<ChatResult> {
  const res = await fetch(`${POLICY_API}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: payload.message,
      conversation_id: payload.conversationId || null,
      top_k: payload.topK || null,
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(await res.text().catch(() => `请求失败(${res.status})`));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let conversationId: string | undefined;
  let citations: ChatCitation[] = [];

  // SSE 帧按空行分隔,逐帧解析 event:/data: 行
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';
    for (const frame of frames) {
      const event = (frame.match(/^event:\s*(.+)$/m) || [])[1];
      const dataLine = (frame.match(/^data:\s*(.*)$/m) || [])[1];
      if (!event || dataLine == null) continue;
      let data: Recordable = {};
      try {
        data = JSON.parse(dataLine);
      } catch {
        continue;
      }
      if (event === 'meta') {
        conversationId = data.conversation_id;
        conversationId && handlers.onMeta?.(conversationId);
      } else if (event === 'citations') {
        citations = mapCitations(data.citations);
        handlers.onCitations?.(citations);
      } else if (event === 'delta') {
        answer += data.text || '';
        handlers.onDelta?.(data.text || '');
      } else if (event === 'done') {
        answer = data.answer || answer;
      }
    }
  }
  return { conversationId, answer, citations };
}
