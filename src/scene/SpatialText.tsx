/**
 * Text rendered inside the 3D scene.
 *
 * A DOM overlay is not the VR interface, so every string a user must read in
 * immersive mode goes through here. The font is chosen per string so Japanese
 * content renders instead of falling back to boxes, and so a Latin-only palace
 * never downloads the larger family.
 */

import { Text } from '@react-three/drei';
import type { ComponentProps } from 'react';
import { pickFont, type FontWeight } from './fonts.ts';

type TextProps = ComponentProps<typeof Text>;

export interface SpatialTextProps extends Omit<TextProps, 'font' | 'children'> {
  readonly children: string;
  readonly weight?: FontWeight;
}

export function SpatialText({ children, weight = 'regular', ...rest }: SpatialTextProps) {
  return (
    <Text font={pickFont(children, weight)} {...rest}>
      {children}
    </Text>
  );
}
