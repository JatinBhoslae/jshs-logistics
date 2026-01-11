import React, { useEffect, useState } from 'react'
import Vapi from '@vapi-ai/web'

type VapiClient = InstanceType<typeof Vapi>

interface VapiWidgetProps {
  apiKey: string
  assistantId: string
  config?: Record<string, unknown>
}

const VapiWidget: React.FC<VapiWidgetProps> = ({ apiKey, assistantId, config = {} }) => {
  const [vapi, setVapi] = useState<VapiClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([])

  useEffect(() => {
    const vapiInstance = new Vapi(apiKey)
    setVapi(vapiInstance)

    // Event listeners
    vapiInstance.on('call-start', () => {
      console.log('Call started')
      setIsConnected(true)
    })

    vapiInstance.on('call-end', () => {
      console.log('Call ended')
      setIsConnected(false)
      setIsSpeaking(false)
    })

    vapiInstance.on('speech-start', () => {
      console.log('Assistant started speaking')
      setIsSpeaking(true)
    })

    vapiInstance.on('speech-end', () => {
      console.log('Assistant stopped speaking')
      setIsSpeaking(false)
    })

    vapiInstance.on('message', (message: any) => {
      if (message?.type === 'transcript') {
        setTranscript(prev => [
          ...prev,
          {
            role: message.role,
            text: message.transcript,
          },
        ])
      }
    })

    vapiInstance.on('error', (error: unknown) => {
      console.error('Vapi error:', error)
    })

    return () => {
      vapiInstance.stop()
    }
  }, [apiKey])

  const startCall = () => {
    if (vapi) {
      vapi.start(assistantId, config)
    }
  }

  const endCall = () => {
    if (vapi) {
      vapi.stop()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {!isConnected ? (
        <button
          onClick={startCall}
          style={{
            background: '#12A594',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(18, 165, 148, 0.3)',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(18, 165, 148, 0.4)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(18, 165, 148, 0.3)'
          }}
        >
          🎤 Talk to Assistant
        </button>
      ) : (
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            width: '420px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.18)',
            border: '1px solid #e1e5e9',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: isSpeaking ? '#ff4444' : '#12A594',
                  animation: isSpeaking ? 'pulse 1s infinite' : 'none',
                }}
              ></div>
              <span style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
                {isSpeaking ? 'Assistant Speaking...' : 'Listening...'}
              </span>
            </div>
            <button
              onClick={endCall}
              style={{
                background: '#ff4444',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              End Call
            </button>
          </div>

          <div
            style={{
              maxHeight: '320px',
              overflowY: 'auto',
              marginBottom: '16px',
              padding: '10px',
              background: '#f8f9fa',
              borderRadius: '10px',
            }}
          >
            {transcript.length === 0 ? (
              <p
                style={{
                  color: '#666',
                  fontSize: '15px',
                  margin: 0,
                }}
              >
                Conversation will appear here...
              </p>
            ) : (
              transcript.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: '8px',
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}
                >
                  <span
                    style={{
                      background: msg.role === 'user' ? '#12A594' : '#333',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: '14px',
                      display: 'inline-block',
                      fontSize: '15px',
                      maxWidth: '85%',
                    }}
                  >
                    {msg.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default VapiWidget
