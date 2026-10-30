export default function AvatarFace({ gender = 'female', talking = false, size = 64 }) {
  return (
    <div style={{ width: size, height: size }} className="relative shrink-0">
      <style>{`
        @keyframes ls-blink { 0%,92%,100%{transform:scaleY(1)} 96%{transform:scaleY(0.1)} }
        @keyframes ls-talk { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(1.6)} }
        @keyframes ls-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        .ls-face{transform-origin:center;animation:ls-bob 3s ease-in-out infinite}
        .ls-eye{transform-origin:center;animation:ls-blink 4.5s infinite}
        .ls-mouth-talk{transform-origin:center;animation:ls-talk 0.32s ease-in-out infinite}
      `}</style>
      <svg viewBox="0 0 100 100" className="ls-face w-full h-full">
        <rect x="38" y="70" width="24" height="22" rx="8" fill="#f2c9a0" />
        <circle cx="50" cy="46" r="26" fill="#f6d5b8" />
        {gender === 'female' ? (
          <path d="M22 46c0-17 12-30 28-30s28 13 28 30c0-7-4-12-9-13 2-5 0-9-5-11-1 4-6 7-14 7s-13-3-14-7c-5 2-7 6-5 11-5 1-9 6-9 13z" fill="#5b3a29" />
        ) : (
          <path d="M26 40c0-15 10-24 24-24s24 9 24 24c0-5-3-8-7-9-1 3-5 5-17 5s-16-2-17-5c-4 1-7 4-7 9z" fill="#3a2a1a" />
        )}
        <ellipse className="ls-eye" cx="40" cy="46" rx="3" ry="4.5" fill="#3a2a1a" />
        <ellipse className="ls-eye" cx="60" cy="46" rx="3" ry="4.5" fill="#3a2a1a" />
        <circle cx="34" cy="54" r="3" fill="#f3a898" opacity="0.55" />
        <circle cx="66" cy="54" r="3" fill="#f3a898" opacity="0.55" />
        <ellipse className={talking ? 'ls-mouth-talk' : ''} cx="50" cy="58" rx="5" ry={talking ? 3 : 2.2} fill="#c0504d" />
      </svg>
    </div>
  );
}