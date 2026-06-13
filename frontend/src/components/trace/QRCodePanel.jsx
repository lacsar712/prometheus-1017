import { useState } from 'react'
import { QrCode, Download, Printer, X } from 'lucide-react'

const API_BASE_URL = 'http://localhost:8000'

export default function QRCodePanel({ batchNo }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {!open && (
        <div
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform z-50"
          onClick={() => setOpen(true)}
        >
          <QrCode className="w-6 h-6 text-white" />
        </div>
      )}

      {open && (
        <div className="fixed bottom-24 right-6 w-72 dashboard-card p-5 z-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-amber-300 font-semibold text-sm">QR Code</span>
            <X
              className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors"
              onClick={() => setOpen(false)}
            />
          </div>

          <div className="flex justify-center mb-4">
            <img
              src={API_BASE_URL + '/api/trace/' + batchNo + '/qrcode?size=400'}
              alt="QR Code"
              className="w-48 h-48 rounded-lg"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-all"
              onClick={() => {
                const link = document.createElement('a')
                link.href = API_BASE_URL + '/api/trace/' + batchNo + '/qrcode?size=800'
                link.download = 'qrcode_' + batchNo + '.png'
                link.click()
              }}
            >
              <Download className="w-4 h-4" />
              Download QR PNG
            </button>

            <a
              className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-all"
              href={API_BASE_URL + '/api/trace/' + batchNo + '/label-pdf'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="w-4 h-4" />
              Download Label PDF
            </a>

            <button
              className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium flex items-center justify-center gap-2 hover:bg-amber-500/30 transition-all"
              onClick={() => {
                window.open(API_BASE_URL + '/api/trace/' + batchNo + '/label-pdf', '_blank')
              }}
            >
              <Printer className="w-4 h-4" />
              Print Label
            </button>
          </div>
        </div>
      )}
    </>
  )
}
