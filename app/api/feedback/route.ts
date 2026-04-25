import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId, buildUnauthorizedResponse } from '@/lib/supabase/server'
import { z } from 'zod'
import { parseJsonBody } from '@/lib/api/validation'
import { apiServerError } from '@/lib/api/response'

const FeedbackSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  userEmail: z.string().trim().email().optional(),
})

/**
 * POST /api/feedback
 * Sends tester feedback via email to shift-coach@outlook.com (Resend or EMAIL_WEBHOOK_URL fallback).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await getServerSupabaseAndUserId()
    
    if (!userId) return buildUnauthorizedResponse()


    const parsed = await parseJsonBody(req, FeedbackSchema)
    if (!parsed.ok) return parsed.response
    const { subject, message, userEmail } = parsed.data

    const emailContent = `
New Tester Feedback from ShiftCoach

From: ${userEmail || 'Unknown'}
User ID: ${userId}
Date: ${new Date().toISOString()}

Subject: ${subject}

Message:
${message}

---
This feedback was submitted from the ShiftCoach app.
    `.trim()

    // Use Resend for email sending
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (resendApiKey) {
      try {
        // Dynamic import to avoid issues if Resend is not installed
        const { Resend } = await import('resend')
        const resend = new Resend(resendApiKey)
        
        // Use verified domain or Resend's default testing domain
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        
        // Validate email format for replyTo (must be valid email or undefined)
        const isValidEmail = (email: string | null | undefined): boolean => {
          if (!email || typeof email !== 'string') return false
          const trimmed = email.trim()
          if (trimmed === '' || trimmed === 'Unknown' || trimmed.toLowerCase() === 'unknown') return false
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          return emailRegex.test(trimmed)
        }
        
        // Only include replyTo if email is valid
        const emailOptions: any = {
          from: fromEmail,
          to: ['shift-coach@outlook.com'],
          subject: `[ShiftCoach Feedback] ${subject}`,
          text: emailContent,
        }
        
        // Only add replyTo if we have a valid email
        if (isValidEmail(userEmail)) {
          emailOptions.replyTo = (userEmail ?? '').trim()
        }
        
        console.log('[api/feedback] Sending email with options:', {
          from: emailOptions.from,
          to: emailOptions.to,
          replyTo: emailOptions.replyTo || 'not set',
          userEmailProvided: userEmail,
        })
        
        const { data, error } = await resend.emails.send(emailOptions)

        if (error) {
          console.error('[api/feedback] Resend error:', error)
          return NextResponse.json(
            { ok: false, error: `Failed to send email: ${error.message || JSON.stringify(error)}`, code: 'email_send_failed' },
            { status: 500 }
          )
        }

        console.log('[api/feedback] Email sent successfully via Resend:', data)
      } catch (resendError: any) {
        console.error('[api/feedback] Resend import/send error:', resendError)
        // Fall through to alternative method
      }
    }

    // Fallback: Use a simple HTTP-based email service or log
    // If Resend is not configured, we'll use a webhook approach
    const emailWebhookUrl = process.env.EMAIL_WEBHOOK_URL
    
    if (emailWebhookUrl && !resendApiKey) {
      try {
        const emailResponse = await fetch(emailWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: 'shift-coach@outlook.com',
            from: userEmail || 'noreply@shiftcoach.app',
            subject: `[ShiftCoach Feedback] ${subject}`,
            text: emailContent,
          }),
        })

        if (!emailResponse.ok) {
          throw new Error('Email webhook returned error')
        }
      } catch (webhookError) {
        console.error('[api/feedback] Webhook error:', webhookError)
      }
    }

    // Log feedback for debugging (always log, even if email fails)
    console.log('[api/feedback] Feedback received:', {
      userEmail,
      userId,
      subject,
      messageLength: message.length,
    })

    // If no email service is configured, return an error
    if (!resendApiKey && !emailWebhookUrl) {
      console.error('[api/feedback] No email service configured. RESEND_API_KEY is required.')
      return apiServerError('email_service_not_configured', 'Email service not configured. Please contact support.')
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback sent successfully',
    })
  } catch (error: any) {
    console.error('[api/feedback] Unexpected error:', error)
    return apiServerError('unexpected_error', error.message || 'Internal server error')
  }
}

