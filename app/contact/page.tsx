'use client'

import type { Metadata } from 'next'
import { useState } from 'react'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: data.message || '문의가 성공적으로 전송되었습니다!'
        })
        // 폼 초기화
        setFormData({ name: '', email: '', subject: '', message: '' })
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.error || '전송에 실패했습니다. 다시 시도해주세요.'
        })
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">문의하기</h1>
          <p className="text-xl text-gray-400">
            질문이나 제안사항이 있으시면 언제든지 연락해주세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Contact Form */}
          <section className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">📧</span>
              <h2 className="text-2xl font-bold">메시지 보내기</h2>
            </div>
            
            {/* 상태 메시지 */}
            {submitStatus.type && (
              <div className={`mb-6 p-4 rounded-lg ${
                submitStatus.type === 'success' 
                  ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                  : 'bg-red-900/20 border border-red-500/30 text-red-400'
              }`}>
                {submitStatus.message}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-white"
                  placeholder="홍길동"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-white"
                  placeholder="your@email.com"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-white"
                  placeholder="무엇에 관한 문의인가요?"
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  메시지
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-white resize-none"
                  placeholder="메시지를 입력하세요..."
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${
                  isSubmitting
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    전송 중...
                  </span>
                ) : (
                  '메시지 보내기'
                )}
              </button>
            </form>

          
          </section>

          {/* Contact Information */}
          <div className="space-y-6">
            {/* Email */}
            <section className="bg-[#1a1a1a] rounded-2xl p-6 border border-gray-800">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📮</div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">이메일 문의</h3>
                  <a 
                    href="mailto:trikilab2025@gmail.com" 
                    className="text-blue-400 hover:text-blue-300 transition-colors text-lg"
                  >
                    trikilab2025@gmail.com
                  </a>
                  <p className="text-sm text-gray-500 mt-3">
                    일반 문의, 비즈니스 제안, 파트너십 등 
                    모든 문의는 위 이메일로 보내주세요
                  </p>
                </div>
              </div>
            </section>

         
          </div>
        </div>
      </div>
    </div>
  )
}