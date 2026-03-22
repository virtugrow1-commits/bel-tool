interface ToastBannerProps {
  toast: { msg: string; type: string } | null;
}

export function ToastBanner({ toast }: ToastBannerProps) {
  if (!toast) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-6 py-2.5 rounded-xl text-[13px] font-semibold shadow-xl border"
      style={{
        animation: 'slideToast 0.25s ease',
        background: toast.type === 'err' ? '#FEF2F2' : toast.type === 'info' ? '#EAF8F7' : '#E6F9F0',
        borderColor: toast.type === 'err' ? '#FECACA' : toast.type === 'info' ? '#C8EEEC' : '#BBF7D0',
        color: toast.type === 'err' ? '#DC2626' : toast.type === 'info' ? '#0D1B3E' : '#16A34A',
      }}
    >
      {toast.msg}
    </div>
  );
}
