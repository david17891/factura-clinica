import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const Video: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Smooth entry fade-in
	const opacity = Math.min(1, frame / 30);

	return (
		<div
			style={{
				flex: 1,
				backgroundColor: '#0d0e12',
				background: 'radial-gradient(circle, #1a1c24 0%, #0d0e12 100%)',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				color: '#ffffff',
				fontFamily: 'system-ui, -apple-system, sans-serif',
				opacity,
			}}
		>
			<h1
				style={{
					fontSize: '80px',
					fontWeight: '800',
					letterSpacing: '-2px',
					marginBottom: '20px',
					background: 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)',
					WebkitBackgroundClip: 'text',
					WebkitTextFillColor: 'transparent',
				}}
			>
				Factura Clínica
			</h1>
			<p
				style={{
					fontSize: '36px',
					color: '#94a3b8',
					fontWeight: '500',
				}}
			>
				Demo cloud controlada con datos ficticios
			</p>
			<div
				style={{
					position: 'absolute',
					bottom: '40px',
					fontSize: '20px',
					color: '#64748b',
				}}
			>
				Frame {frame} | FPS: {fps}
			</div>
		</div>
	);
};
