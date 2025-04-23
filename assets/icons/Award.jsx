import * as React from "react";
import Svg, { Circle, Path } from "react-native-svg";

const Award = (props) => (
  <Svg
    width={24}
    height={24}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Circle cx={12} cy={8} r={7} />
    <Path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" />
  </Svg>
);

export default Award; 