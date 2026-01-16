interface IntelPopupProps {
    intelPopup: { message: string; type: 'private' | 'public' } | null
    onClose: () => void;
}

const IntelPopup = ({ intelPopup, onClose }: IntelPopupProps) => {
    if (!intelPopup) return null;

    const { type, message } = intelPopup;

    return (
        <div style={{
            position: "fixed",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "90%",
            maxWidth: "400px",
            backgroundColor: type === 'private'
                ? "#2c1e12"
                : message.includes("YOU!")
                    ? "#2d1b1b"
                    : "#1a1a1a",
            border: `2px solid ${type === 'private' ? "#c5a059" : "#444"}`,
            borderRadius: "12px",
            padding: "20px",
            zIndex: 9999,
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
            animation: "slideUpFade 0.5s ease-out forwards",
            cursor: "pointer"
        }} onClick={onClose}>
            <div style={{
                fontFamily: "'Cinzel', serif",
                color: "#c5a059",
                fontSize: "12px",
                letterSpacing: "2px",
                marginBottom: "10px",
                display: "flex",
                justifyContent: "space-between"
            }}>
                <span>{type === 'private' ? "CONFIDENTIAL" : "INTELLIGENCE ALERT"}</span>
                <span>✕</span>
            </div>

            <div style={{
                whiteSpace: "pre-line",
                color: "#e0e0e0",
                fontFamily: "'EB Garamond', serif",
                fontSize: "17px",
                lineHeight: "1.4"
            }}>
                {message}
            </div>

            <style>{`
          @keyframes slideUpFade {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
        `}</style>
        </div>
    );
};

export default IntelPopup;