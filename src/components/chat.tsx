'use client'

import { useState, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { CopyIcon, CheckIcon } from 'lucide-react'
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputFooter,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <MessageAction tooltip={copied ? "Copied!" : "Copy"} onClick={handleCopy}>
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
    </MessageAction>
  )
}

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  return message.parts?.filter(p => p.type === 'text').map(p => p.type === 'text' ? p.text : '').join('') || ''
}

export function ChatSection() {
  const { messages, status, sendMessage } = useChat()

  const onSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return
    sendMessage({ text: message.text })
  }

  return (
    <div className="flex h-[80vh] flex-col gap-4">
      <Conversation className="flex-1 rounded-lg border bg-card">
        <ConversationContent>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Start a conversation
            </div>
          ) : (
            messages.map((message) => {
              const text = getMessageText(message)
              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.role === 'user' ? (
                      <p>{text}</p>
                    ) : (
                      <MessageResponse>{text}</MessageResponse>
                    )}
                  </MessageContent>
                  {message.role === 'assistant' && text && (
                    <MessageActions>
                      <CopyButton text={text} />
                    </MessageActions>
                  )}
                </Message>
              )
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={onSubmit}>
        <PromptInputTextarea placeholder="Type a message..." />
        <PromptInputFooter>
          <div />
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
