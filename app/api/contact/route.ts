import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json()

    // 입력 검증
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      )
    }

    // Nodemailer transporter 설정
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // trikilab2025@gmail.com
        pass: process.env.EMAIL_PASSWORD, // Gmail 앱 비밀번호
      },
    })

    // 이메일 옵션
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'trikilab2025@gmail.com',
      subject: `[Trend Soccer 문의] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
            새로운 문의가 도착했습니다
          </h2>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>이름:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>이메일:</strong> ${email}</p>
            <p style="margin: 10px 0;"><strong>제목:</strong> ${subject}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #374151;">메시지 내용:</h3>
            <p style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #2563eb; white-space: pre-wrap;">
              ${message}
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px;">
              이 메시지는 Trend Soccer 웹사이트의 문의 폼에서 전송되었습니다.
            </p>
            <p style="color: #6b7280; font-size: 12px;">
              답변을 보내려면 ${email}로 회신하세요.
            </p>
          </div>
        </div>
      `,
      replyTo: email, // 답장 시 문의자 이메일로 전송
    }

    // 이메일 전송
    await transporter.sendMail(mailOptions)

    return NextResponse.json(
      { 
        success: true,
        message: '문의가 성공적으로 전송되었습니다. '
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('이메일 전송 오류:', error)
    return NextResponse.json(
      { error: '이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
