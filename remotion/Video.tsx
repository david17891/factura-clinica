import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Audio } from 'remotion';

// Import Constants and Audio Config
import { WIDTH, HEIGHT } from './constants';
import { HAS_AUDIO } from './audio-config';

export const Video: React.FC = () => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Global Safe Voiceover Audio Loader
	const audioSrc = staticFile('remotion-assets/factura-clinica-demo-voiceover.mp3');

	// Helper to calculate elastic text entry
	const getSpringTranslation = (startFrame: number, delay = 0) => {
		return spring({
			frame: frame - startFrame - delay,
			fps,
			config: { damping: 14, stiffness: 90 },
		});
	};

	// ----------------------------------------------------
	// SCENE 1: El Caos Administrativo (Frames 0 - 300)
	// ----------------------------------------------------
	const s1Start = 0;
	const s1End = 300;
	const s1Active = frame >= s1Start && frame < s1End;
	const s1Opacity = interpolate(frame, [s1Start, s1Start + 15, s1End - 15, s1End], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s1Scale = interpolate(frame, [s1Start, s1End], [1.0, 1.05], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s1TextVal = getSpringTranslation(s1Start, 5);

	// ----------------------------------------------------
	// SCENE 2: Presentación de FiscoBot (Frames 300 - 600)
	// ----------------------------------------------------
	const s2Start = 300;
	const s2End = 600;
	const s2Active = frame >= s2Start && frame < s2End;
	const s2Opacity = interpolate(frame, [s2Start, s2Start + 15, s2End - 15, s2End], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s2Scale = interpolate(frame, [s2Start, s2End], [1.02, 1.07], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s2Slide = interpolate(frame, [s2Start, s2Start + 20], [-100, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s2TextVal = getSpringTranslation(s2Start, 5);

	// ----------------------------------------------------
	// SCENE 3: Recepción Simplificada (Frames 600 - 900)
	// ----------------------------------------------------
	const s3Start = 600;
	const s3End = 900;
	const s3Active = frame >= s3Start && frame < s3End;
	const s3Opacity = interpolate(frame, [s3Start, s3Start + 15, s3End - 15, s3End], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s3Scale = interpolate(frame, [s3Start, s3End], [1.0, 1.04], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s3TextVal = getSpringTranslation(s3Start, 5);
	// Modal entry pop-up overlay frame 720 onwards
	const s3ModalOpacity = interpolate(frame, [s3Start + 120, s3Start + 135], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s3ModalScale = spring({
		frame: frame - (s3Start + 120),
		fps,
		config: { damping: 12 },
	});

	// ----------------------------------------------------
	// SCENE 4: Carga e Ingesta Inteligente (Frames 900 - 1350)
	// ----------------------------------------------------
	const s4Start = 900;
	const s4End = 1350;
	const s4Active = frame >= s4Start && frame < s4End;
	const s4Opacity = interpolate(frame, [s4Start, s4Start + 15, s4End - 15, s4End], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s4Scale = interpolate(frame, [s4Start, s4End], [1.0, 1.08], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s4TextVal = getSpringTranslation(s4Start, 5);

	// ----------------------------------------------------
	// SCENE 5: Panel Administrativo del Contador (Frames 1350 - 1650)
	// ----------------------------------------------------
	const s5Start = 1350;
	const s5End = 1650;
	const s5Active = frame >= s5Start && frame < s5End;
	const s5Opacity = interpolate(frame, [s5Start, s5Start + 15, s5End - 15, s5End], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s5Scale = interpolate(frame, [s5Start, s5End], [1.0, 1.04], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s5TextVal = getSpringTranslation(s5Start, 5);

	// ----------------------------------------------------
	// SCENE 6: WhatsApp Manual Assist & Corrección (Frames 1650 - 2040)
	// ----------------------------------------------------
	const s6Start = 1650;
	const s6End = 2040;
	const s6Active = frame >= s6Start && frame < s6End;
	const s6Opacity = interpolate(frame, [s6Start, s6Start + 15, s6End - 15, s6End], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s6ScaleLeft = interpolate(frame, [s6Start, s6End], [1.0, 1.04], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s6ScaleRight = interpolate(frame, [s6Start + 80, s6End], [0.95, 1.03], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s6OpacityRight = interpolate(frame, [s6Start + 80, s6Start + 95], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s6TextVal = getSpringTranslation(s6Start, 5);

	// ----------------------------------------------------
	// SCENE 7: Exportación y Cierre (Frames 2040 - 2250)
	// ----------------------------------------------------
	const s7Start = 2040;
	const s7End = 2250;
	const s7Active = frame >= s7Start && frame < s7End;
	const s7Opacity = interpolate(frame, [s7Start, s7Start + 15, s7End - 15, s7End], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s7Scale = interpolate(frame, [s7Start, s7End], [1.05, 1.0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	const s7TextVal = getSpringTranslation(s7Start, 5);

	// Pulse effect for the export button at frame 2140
	const s7Pulse = interpolate(Math.sin((frame - s7Start) / 5), [-1, 1], [1.0, 1.06]);

	return (
		<div
			style={{
				flex: 1,
				width: WIDTH,
				height: HEIGHT,
				backgroundColor: '#07080b',
				fontFamily: 'system-ui, -apple-system, sans-serif',
				overflow: 'hidden',
				position: 'relative',
			}}
		>
			{/* Safe Voiceover Audio Hook */}
			{HAS_AUDIO && audioSrc && <Audio src={audioSrc} startFrom={0} />}

			{/* ==================================================== */}
			{/* SCENE 1 LAYOUT */}
			{/* ==================================================== */}
			{s1Active && (
				<div
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						opacity: s1Opacity,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 80px',
						background: 'radial-gradient(circle at 80% 20%, #1e1b4b 0%, #07080b 60%)',
					}}
				>
					{/* Left text with spring animation */}
					<div
						style={{
							width: '600px',
							display: 'flex',
							flexDirection: 'column',
							transform: `translateY(${interpolate(s1TextVal, [0, 1], [40, 0])}px)`,
						}}
					>
						<span style={{ color: '#6366f1', fontWeight: 'bold', fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>El Caos Contable</span>
						<h1 style={{ color: '#ffffff', fontSize: '64px', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
							¿Perdiendo tiempo facturando por WhatsApp?
						</h1>
						<p style={{ color: '#94a3b8', fontSize: '24px', lineHeight: '1.5' }}>
							Las solicitudes de los pacientes se pierden en los chats, llegan incompletas y generan retrabajo para su clínica y contador.
						</p>
					</div>

					{/* Right mockup with zoom animation */}
					<div
						style={{
							width: '1000px',
							height: '620px',
							borderRadius: '16px',
							border: '1px solid rgba(255, 255, 255, 0.08)',
							overflow: 'hidden',
							boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5)',
							transform: `scale(${s1Scale})`,
							background: '#111827',
						}}
					>
						<img
							src={staticFile('remotion-assets/landing_factura_clinica.png')}
							style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							alt="Landing"
						/>
					</div>
				</div>
			)}

			{/* ==================================================== */}
			{/* SCENE 2 LAYOUT */}
			{/* ==================================================== */}
			{s2Active && (
				<div
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						opacity: s2Opacity,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 80px',
						background: 'radial-gradient(circle at 10% 80%, #311042 0%, #07080b 70%)',
					}}
				>
					{/* Left text */}
					<div
						style={{
							width: '600px',
							display: 'flex',
							flexDirection: 'column',
							transform: `translateY(${interpolate(s2TextVal, [0, 1], [40, 0])}px)`,
						}}
					>
						<span style={{ color: '#d946ef', fontWeight: 'bold', fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Solución Inteligente</span>
						<h1 style={{ color: '#ffffff', fontSize: '64px', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
							FiscoBot: El Portal Fiscal de su Clínica
						</h1>
						<p style={{ color: '#94a3b8', fontSize: '24px', lineHeight: '1.5' }}>
							Un flujo automatizado y privado que conecta de manera controlada y transparente a la recepción de su clínica, al paciente y al contador.
						</p>
					</div>

					{/* Right mockup with slide entry and zoom */}
					<div
						style={{
							width: '1000px',
							height: '620px',
							borderRadius: '16px',
							border: '1px solid rgba(255, 255, 255, 0.08)',
							overflow: 'hidden',
							boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5)',
							transform: `translateX(${s2Slide}px) scale(${s2Scale})`,
							background: '#111827',
						}}
					>
						<img
							src={staticFile('remotion-assets/login_roles_demo.png')}
							style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							alt="Roles"
						/>
					</div>
				</div>
			)}

			{/* ==================================================== */}
			{/* SCENE 3 LAYOUT */}
			{/* ==================================================== */}
			{s3Active && (
				<div
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						opacity: s3Opacity,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 80px',
						background: 'radial-gradient(circle at 80% 80%, #0369a1 0%, #07080b 60%)',
					}}
				>
					{/* Left text */}
					<div
						style={{
							width: '600px',
							display: 'flex',
							flexDirection: 'column',
							transform: `translateY(${interpolate(s3TextVal, [0, 1], [40, 0])}px)`,
						}}
					>
						<span style={{ color: '#0ea5e9', fontWeight: 'bold', fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Paso 1: Recepción</span>
						<h1 style={{ color: '#ffffff', fontSize: '64px', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
							Cobre como siempre. Genere link en 2 clics.
						</h1>
						<p style={{ color: '#94a3b8', fontSize: '24px', lineHeight: '1.5' }}>
							La recepcionista registra la venta diaria en segundos. El sistema genera un código QR y un enlace seguro para compartir con el cliente.
						</p>
					</div>

					{/* Right mockup container with overlays */}
					<div
						style={{
							width: '1000px',
							height: '620px',
							position: 'relative',
							transform: `scale(${s3Scale})`,
						}}
					>
						{/* Base Dashboard */}
						<div
							style={{
								width: '100%',
								height: '100%',
								borderRadius: '16px',
								border: '1px solid rgba(255, 255, 255, 0.08)',
								overflow: 'hidden',
								boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
								background: '#111827',
							}}
						>
							<img
								src={staticFile('remotion-assets/recepcion_crear_venta.png')}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
								alt="Recepcion"
							/>
						</div>

						{/* Interactive pop-up card for QR generated */}
						<div
							style={{
								position: 'absolute',
								top: '10%',
								left: '15%',
								width: '700px',
								height: '420px',
								borderRadius: '16px',
								border: '1px solid rgba(255, 255, 255, 0.15)',
								boxShadow: '0 30px 60px rgba(0, 0, 0, 0.7)',
								overflow: 'hidden',
								opacity: s3ModalOpacity,
								transform: `scale(${interpolate(s3ModalScale, [0, 1], [0.8, 1.0])})`,
								zIndex: 10,
							}}
						>
							<img
								src={staticFile('remotion-assets/venta_link_qr_generado.png')}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
								alt="Venta QR"
							/>
						</div>
					</div>
				</div>
			)}

			{/* ==================================================== */}
			{/* SCENE 4 LAYOUT */}
			{/* ==================================================== */}
			{s4Active && (
				<div
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						opacity: s4Opacity,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 80px',
						background: 'radial-gradient(circle at 20% 20%, #15803d 0%, #07080b 60%)',
					}}
				>
					{/* Left text */}
					<div
						style={{
							width: '600px',
							display: 'flex',
							flexDirection: 'column',
							transform: `translateY(${interpolate(s4TextVal, [0, 1], [40, 0])}px)`,
						}}
					>
						<span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Paso 2: Paciente</span>
						<h1 style={{ color: '#ffffff', fontSize: '64px', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
							Prellenado privado desde Constancia Fiscal
						</h1>
						<p style={{ color: '#94a3b8', fontSize: '24px', lineHeight: '1.5' }}>
							El paciente escanea el QR o abre el enlace en su celular, arrastra su Constancia PDF ficticia y FiscoBot rellena régimen, RFC y nombre fiscal en segundos. ¡Cero errores!
						</p>
					</div>

					{/* Right mockup simulated mobile centered */}
					<div
						style={{
							width: '1000px',
							height: '620px',
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							transform: `scale(${s4Scale})`,
						}}
					>
						<div
							style={{
								width: '450px',
								height: '620px',
								borderRadius: '36px',
								border: '8px solid #1e293b',
								overflow: 'hidden',
								boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)',
								background: '#0f172a',
							}}
						>
							<img
								src={staticFile('remotion-assets/paciente_constancia_prefill.png')}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
								alt="Paciente"
							/>
						</div>
					</div>
				</div>
			)}

			{/* ==================================================== */}
			{/* SCENE 5 LAYOUT */}
			{/* ==================================================== */}
			{s5Active && (
				<div
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						opacity: s5Opacity,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 80px',
						background: 'radial-gradient(circle at 80% 30%, #4338ca 0%, #07080b 65%)',
					}}
				>
					{/* Left text */}
					<div
						style={{
							width: '600px',
							display: 'flex',
							flexDirection: 'column',
							transform: `translateY(${interpolate(s5TextVal, [0, 1], [40, 0])}px)`,
						}}
					>
						<span style={{ color: '#818cf8', fontWeight: 'bold', fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Paso 3: Contador</span>
						<h1 style={{ color: '#ffffff', fontSize: '64px', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
							Panel ordenado para auditoría contable
						</h1>
						<p style={{ color: '#94a3b8', fontSize: '24px', lineHeight: '1.5' }}>
							El despacho contable o administrador visualiza de inmediato la solicitud estructurada en estado &apos;Recibida&apos;, lista para procesar en un listado limpio.
						</p>
					</div>

					{/* Right mockup browser */}
					<div
						style={{
							width: '1000px',
							height: '620px',
							borderRadius: '16px',
							border: '1px solid rgba(255, 255, 255, 0.08)',
							overflow: 'hidden',
							boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5)',
							transform: `scale(${s5Scale})`,
							background: '#111827',
						}}
					>
						<img
							src={staticFile('remotion-assets/contador_solicitudes_panel.png')}
							style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							alt="Contador Panel"
						/>
					</div>
				</div>
			)}

			{/* ==================================================== */}
			{/* SCENE 6 LAYOUT */}
			{/* ==================================================== */}
			{s6Active && (
				<div
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						opacity: s6Opacity,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 80px',
						background: 'radial-gradient(circle at 10% 20%, #b91c1c 0%, #07080b 60%)',
					}}
				>
					{/* Left text */}
					<div
						style={{
							width: '600px',
							display: 'flex',
							flexDirection: 'column',
							transform: `translateY(${interpolate(s6TextVal, [0, 1], [40, 0])}px)`,
						}}
					>
						<span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Corrección sin llamadas</span>
						<h1 style={{ color: '#ffffff', fontSize: '64px', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
							WhatsApp Manual Assist en un clic
						</h1>
						<p style={{ color: '#94a3b8', fontSize: '24px', lineHeight: '1.5' }}>
							Si falta algún dato fiscal, el contador marca el error. El sistema genera un aviso estructurado listo para enviarse por el WhatsApp del negocio. El paciente corrige de inmediato.
						</p>
					</div>

					{/* Right mockup split screen */}
					<div
						style={{
							width: '1000px',
							height: '620px',
							display: 'flex',
							flexDirection: 'row',
							justifyContent: 'space-between',
							alignItems: 'center',
							gap: '24px',
						}}
					>
						{/* Left Split: Requiere corrección browser screen */}
						<div
							style={{
								width: '580px',
								height: '520px',
								borderRadius: '12px',
								border: '1px solid rgba(255, 255, 255, 0.08)',
								overflow: 'hidden',
								boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
								transform: `scale(${s6ScaleLeft})`,
								background: '#111827',
							}}
						>
							<img
								src={staticFile('remotion-assets/contador_requiere_correccion.png')}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
								alt="Correccion panel"
							/>
						</div>

						{/* Right Split: Red Alerta correction mobile entry (delayed pop-up) */}
						<div
							style={{
								width: '360px',
								height: '550px',
								borderRadius: '24px',
								border: '6px solid #ef4444',
								overflow: 'hidden',
								boxShadow: '0 30px 50px rgba(239, 68, 68, 0.15)',
								opacity: s6OpacityRight,
								transform: `scale(${s6ScaleRight})`,
								background: '#0f172a',
							}}
						>
							<img
								src={staticFile('remotion-assets/paciente_correccion.png')}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
								alt="Paciente Alerta"
							/>
						</div>
					</div>
				</div>
			)}

			{/* ==================================================== */}
			{/* SCENE 7 LAYOUT */}
			{/* ==================================================== */}
			{s7Active && (
				<div
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						opacity: s7Opacity,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0 80px',
						background: 'radial-gradient(circle at 50% 50%, #064e3b 0%, #07080b 70%)',
					}}
				>
					{/* Left text */}
					<div
						style={{
							width: '600px',
							display: 'flex',
							flexDirection: 'column',
							transform: `translateY(${interpolate(s7TextVal, [0, 1], [40, 0])}px)`,
						}}
					>
						<span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '24px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Cierre y Exportación</span>
						<h1 style={{ color: '#ffffff', fontSize: '64px', fontWeight: '800', lineHeight: '1.1', marginBottom: '24px' }}>
							UUID, CSV y cierre contable sin errores
						</h1>
						<p style={{ color: '#94a3b8', fontSize: '24px', lineHeight: '1.5', marginBottom: '20px' }}>
							Con los datos ficticios corregidos por el paciente, el contador asocia la facturación y descarga un reporte CSV completamente sanitizado y ordenado para contabilidad.
						</p>
						<span style={{ color: '#64748b', fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>
							* Factura Clínica — Demo cloud controlada
						</span>
					</div>

					{/* Right mockup browser */}
					<div
						style={{
							width: '1000px',
							height: '620px',
							borderRadius: '16px',
							border: '1px solid rgba(255, 255, 255, 0.08)',
							overflow: 'hidden',
							boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5)',
							transform: `scale(${s7Scale})`,
							background: '#111827',
							position: 'relative',
						}}
					>
						<img
							src={staticFile('remotion-assets/export_csv_seguro.png')}
							style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							alt="Export CSV"
						/>

						{/* Pulsing indicator on the CSV Export button at bottom-left area */}
						<div
							style={{
								position: 'absolute',
								bottom: '22px',
								right: '25px',
								width: '240px',
								height: '42px',
								borderRadius: '8px',
								border: '2px solid #10b981',
								boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)',
								transform: `scale(${s7Pulse})`,
								pointerEvents: 'none',
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
};
