import * as React from "react";
import Svg, { Path } from "react-native-svg";

const Navigation = (props) => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M3 11l19-9-9 19-2-8-8-2z" />
  </Svg>
);

export default Navigation; 