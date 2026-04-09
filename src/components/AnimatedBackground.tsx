const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          animation: 'grid-move 20s linear infinite',
        }}
      />
      {/* Glow orb 1 - cyan */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-glow-drift"
        style={{
          top: '10%',
          left: '20%',
          background: 'radial-gradient(circle, hsla(186,94%,55%,0.08) 0%, transparent 70%)',
        }}
      />
      {/* Glow orb 2 - purple */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full animate-glow-drift"
        style={{
          top: '50%',
          right: '10%',
          background: 'radial-gradient(circle, hsla(270,60%,55%,0.06) 0%, transparent 70%)',
          animationDelay: '4s',
        }}
      />
      {/* Glow orb 3 - blue */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full animate-glow-drift"
        style={{
          bottom: '10%',
          left: '40%',
          background: 'radial-gradient(circle, hsla(217,91%,60%,0.05) 0%, transparent 70%)',
          animationDelay: '8s',
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
