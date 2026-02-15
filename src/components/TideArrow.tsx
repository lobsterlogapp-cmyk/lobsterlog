import React from 'react';
import { Svg, Path } from 'react-native-svg';

const TideArrow = ({ size = 32 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12 2L2 22L12 18L22 22L12 2Z"
            fill="#FBBF24"
            stroke="#FEF3C7"
            strokeWidth="2"
            strokeLinejoin="round"
        />
    </Svg>
);

export default TideArrow;