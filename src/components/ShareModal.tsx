import { useState } from 'react';
import { Send, Copy, Check, X, Link2 } from 'lucide-react';

type Props = {
  url: string;
  onClose: () => void;
};

export default function ShareModal({ url, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'DevGram', url });
        onClose();
      } catch {
        // user cancelled — keep modal open
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center px-5 py-3 border-b border-[#dbdbdb] relative">
          <h3 className="font-semibold text-sm text-[#262626]">Share</h3>
          <button onClick={onClose} className="absolute right-4 text-[#8e8e8e] hover:text-[#262626]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <button
            onClick={nativeShare}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#fafafa] transition text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#0095f6] flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#262626]">Share via…</p>
              <p className="text-xs ig-gray">Send to another app</p>
            </div>
          </button>

          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#fafafa] transition text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#efefef] flex items-center justify-center">
              {copied ? <Check className="w-5 h-5 text-[#0095f6]" /> : <Link2 className="w-5 h-5 text-[#262626]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#262626]">{copied ? 'Link copied!' : 'Copy link'}</p>
              <p className="text-xs ig-gray truncate">{url}</p>
            </div>
            {!copied && <Copy className="w-4 h-4 text-[#8e8e8e]" />}
          </button>
        </div>
      </div>
    </div>
  );
}
