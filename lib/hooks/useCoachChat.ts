import { useState } from 'react'

export type CoachMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export function useCoachChat(initialMessages: CoachMessage[] = []) {
  const [messages, setMessages] = useState<CoachMessage[]>(initialMessages)
  const [isSending, setIsSending] = useState(false)

  const sendMessage = async (text: string, context?: any) => {
    if (!text.trim() || isSending) return

    const localId = `local-${Date.now()}`
    const newUserMessage: CoachMessage = {
      id: localId,
      role: 'user',
      content: text,
    }

    setMessages((prev) => [...prev, newUserMessage])
    setIsSending(true)

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for auth
        body: JSON.stringify({ message: text, context }),
      })

      // Try to read response body
      let responseData: any = null
      let responseText: string | null = null
      const contentType = res.headers.get('content-type') || ''

      try {
        // First, try to get the raw text
        responseText = await res.text()
        
        // Try to parse as JSON if it looks like JSON
        if (responseText && (contentType.includes('application/json') || responseText.trim().startsWith('{'))) {
          try {
            responseData = JSON.parse(responseText)
          } catch (parseError) {
            // Not valid JSON, keep as text
            console.warn('Failed to parse JSON response:', parseError)
          }
        }
      } catch (readError) {
        console.error('Failed to read response body:', readError)
      }

      if (!res.ok) {
        // Build error data with fallbacks
        const errorData = responseData || (responseText ? { message: responseText } : { error: 'Unknown error', status: res.status })

        // Enhanced logging with all available info
        console.error('Coach API error:', {
          status: res.status,
          statusText: res.statusText,
          contentType,
          url: '/api/coach',
          rawText: responseText ? responseText.substring(0, 500) : '(empty)',
          rawTextLength: responseText?.length || 0,
          parsedBody: errorData,
          hasResponseData: !!responseData,
          hasResponseText: !!responseText,
        })

        // Extract error message with multiple fallbacks
        const errorMessage =
          errorData?.error ||
          errorData?.message ||
          errorData?.detail ||
          (responseText && responseText.length > 0 ? responseText.substring(0, 200) : `HTTP ${res.status}: ${res.statusText || 'Unknown error'}`)

        throw new Error(errorMessage)
      }

      // Parse response if we got text but not JSON
      if (!responseData && responseText) {
        try {
          responseData = JSON.parse(responseText)
        } catch {
          // Not JSON, keep as text
        }
      }

      const replyText =
        (responseData && responseData.reply) ||
        responseText ||
        "Sorry, I couldn't respond right now."

      const assistantMessage: CoachMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('Error sending coach message:', err)
      // Add error message to chat
      const errorMessage: CoachMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          err instanceof Error
            ? `I couldn't reply just now: ${err.message}`
            : "I couldn't reply just now. Please try again.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsSending(false)
    }
  }

  return { messages, isSending, sendMessage, setMessages }
}

