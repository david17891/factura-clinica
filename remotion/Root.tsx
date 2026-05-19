import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import { COMP_NAME, DURATION_IN_FRAMES, FPS, WIDTH, HEIGHT } from './constants';

export const Root: React.FC = () => {
	return (
		<>
			<Composition
				id={COMP_NAME}
				component={Video}
				durationInFrames={DURATION_IN_FRAMES}
				fps={FPS}
				width={WIDTH}
				height={HEIGHT}
			/>
		</>
	);
};
