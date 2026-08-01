import type { PieceKind } from "@animal-chess/game-core";
import { memo } from "react";
import { PIECE_PALETTE } from "@/lib/piece-palette";

/**
 * Flat portrait of one animal, drawn from the same palette as its 3D mesh. Used wherever a piece
 * needs a face instead of a bare rank number (rank rail, captured tray).
 */
export const PieceAvatar = memo(function PieceAvatar({ kind, size = 26 }: { kind: PieceKind; size?: number }) {
  const pal = PIECE_PALETTE[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <title>{kind}</title>
      <Face kind={kind} pal={pal} />
    </svg>
  );
});

type Palette = { body: string; belly: string; dark: string };

/** Two glossy eyes at a shared height. */
function Eyes({ y = 16, x = 4.6, r = 1.5 }: { y?: number; x?: number; r?: number }) {
  return (
    <>
      <circle cx={16 - x} cy={y} r={r} fill="#1a120e" />
      <circle cx={16 + x} cy={y} r={r} fill="#1a120e" />
      <circle cx={16 - x + 0.5} cy={y - 0.5} r={r * 0.35} fill="#ffffff" />
      <circle cx={16 + x + 0.5} cy={y - 0.5} r={r * 0.35} fill="#ffffff" />
    </>
  );
}

function Face({ kind, pal }: { kind: PieceKind; pal: Palette }) {
  switch (kind) {
    case "rat":
      return (
        <g>
          <circle cx="8" cy="10" r="5" fill={pal.body} />
          <circle cx="24" cy="10" r="5" fill={pal.body} />
          <circle cx="8" cy="10" r="2.8" fill="#caa090" />
          <circle cx="24" cy="10" r="2.8" fill="#caa090" />
          <circle cx="16" cy="17" r="9" fill={pal.body} />
          <ellipse cx="16" cy="21.5" rx="5" ry="4" fill={pal.belly} />
          <Eyes y={16} x={4} />
          <circle cx="16" cy="21" r="1.6" fill="#1a120e" />
          <path d="M6 21h6M6 24h6M20 21h6M20 24h6" stroke={pal.belly} strokeWidth="0.9" strokeLinecap="round" />
        </g>
      );
    case "cat":
      return (
        <g>
          <path d="M7 12 L8 3 L15 8 Z" fill={pal.body} />
          <path d="M25 12 L24 3 L17 8 Z" fill={pal.body} />
          <path d="M9.5 11 L10 6.5 L13.5 9 Z" fill="#e8b6c0" />
          <path d="M22.5 11 L22 6.5 L18.5 9 Z" fill="#e8b6c0" />
          <circle cx="16" cy="17" r="9.5" fill={pal.body} />
          <ellipse cx="16" cy="21" rx="5.5" ry="4" fill={pal.belly} />
          <path d="M13 11.5 16 9 19 11.5" stroke={pal.dark} strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <Eyes y={16} x={4.4} />
          <path d="M14.6 20.6 16 22 17.4 20.6" stroke="#1a120e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M4 19h6M4 22h6M22 19h6M22 22h6" stroke={pal.belly} strokeWidth="0.9" strokeLinecap="round" />
        </g>
      );
    case "dog":
      return (
        <g>
          <ellipse cx="6.5" cy="16" rx="3.6" ry="7" fill={pal.dark} />
          <ellipse cx="25.5" cy="16" rx="3.6" ry="7" fill={pal.dark} />
          <circle cx="16" cy="16" r="9.5" fill={pal.body} />
          <ellipse cx="16" cy="21" rx="6" ry="4.5" fill={pal.belly} />
          <Eyes y={14.5} x={4.4} />
          <ellipse cx="16" cy="19.5" rx="2" ry="1.5" fill="#1a120e" />
          <path d="M16 21v2.5" stroke={pal.dark} strokeWidth="1" strokeLinecap="round" />
          <path d="M14.4 24.5q1.6 3 3.2 0z" fill="#e08a8a" />
        </g>
      );
    case "wolf":
      return (
        <g>
          <path d="M6 13 L7.5 2.5 L14 8 Z" fill={pal.body} />
          <path d="M26 13 L24.5 2.5 L18 8 Z" fill={pal.body} />
          <path d="M8.5 11.5 L9.3 6 L12.5 9 Z" fill={pal.dark} />
          <path d="M23.5 11.5 L22.7 6 L19.5 9 Z" fill={pal.dark} />
          <path d="M16 27 6.8 15 Q16 9 25.2 15 Z" fill={pal.body} />
          <path d="M16 26.5 11.5 19 Q16 16 20.5 19 Z" fill={pal.belly} />
          <Eyes y={16} x={4.2} />
          <path d="M10.5 13.5 13.5 12M21.5 13.5 18.5 12" stroke={pal.dark} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="16" cy="22.5" r="1.5" fill="#1a120e" />
        </g>
      );
    case "leopard":
      return (
        <g>
          <path d="M7.5 11 L8.5 4 L14.5 8.5 Z" fill={pal.body} />
          <path d="M24.5 11 L23.5 4 L17.5 8.5 Z" fill={pal.body} />
          <circle cx="16" cy="17" r="10" fill={pal.body} />
          <ellipse cx="16" cy="21.5" rx="5.5" ry="4" fill={pal.belly} />
          <g fill={pal.dark} opacity="0.85">
            <circle cx="8.5" cy="15" r="1.5" />
            <circle cx="23.5" cy="15" r="1.5" />
            <circle cx="9.5" cy="21" r="1.3" />
            <circle cx="22.5" cy="21" r="1.3" />
            <circle cx="16" cy="9.5" r="1.3" />
          </g>
          <Eyes y={16} x={4.6} />
          <path d="M14.6 20.8 16 22.2 17.4 20.8" stroke="#1a120e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "tiger":
      return (
        <g>
          <circle cx="8" cy="9" r="4" fill={pal.body} />
          <circle cx="24" cy="9" r="4" fill={pal.body} />
          <circle cx="8" cy="9" r="2" fill={pal.dark} />
          <circle cx="24" cy="9" r="2" fill={pal.dark} />
          <circle cx="16" cy="17" r="10" fill={pal.body} />
          <ellipse cx="16" cy="21.5" rx="6" ry="4.5" fill={pal.belly} />
          <g stroke={pal.dark} strokeWidth="1.4" strokeLinecap="round">
            <path d="M16 7.5v3.5M11.5 9.5 12.5 12.5M20.5 9.5 19.5 12.5" />
            <path d="M6.5 15.5 9.5 16.5M25.5 15.5 22.5 16.5" />
            <path d="M6.8 20 9.6 20.5M25.2 20 22.4 20.5" />
          </g>
          <Eyes y={16} x={4.6} />
          <path d="M14.4 20.8 16 22.4 17.6 20.8" stroke="#1a120e" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      );
    case "lion":
      return (
        <g>
          <circle cx="16" cy="16" r="14" fill={pal.dark} />
          <circle cx="16" cy="16" r="11.5" fill="#6a451f" opacity="0.55" />
          <circle cx="16" cy="17" r="9" fill={pal.body} />
          <ellipse cx="16" cy="21" rx="5.5" ry="4" fill={pal.belly} />
          <circle cx="8.5" cy="9.5" r="2.4" fill={pal.dark} />
          <circle cx="23.5" cy="9.5" r="2.4" fill={pal.dark} />
          <path d="M12.4 12.8 15 11.6M19.6 12.8 17 11.6" stroke="#5e3e1a" strokeWidth="1.2" strokeLinecap="round" />
          <Eyes y={16} x={4.2} />
          <path d="M14.6 20.6 16 22 17.4 20.6" stroke="#1a120e" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case "elephant":
      return (
        <g>
          <ellipse cx="5.5" cy="15" rx="5" ry="7.5" fill={pal.dark} />
          <ellipse cx="26.5" cy="15" rx="5" ry="7.5" fill={pal.dark} />
          <ellipse cx="6.5" cy="15" rx="3" ry="5" fill={pal.body} />
          <ellipse cx="25.5" cy="15" rx="3" ry="5" fill={pal.body} />
          <circle cx="16" cy="15" r="9.5" fill={pal.body} />
          <path
            d="M16 18q-2.4 4.5-.6 8.4 1.2 2.6 3.2 1.2"
            stroke={pal.body}
            strokeWidth="3.4"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M12.6 19.5q-1.2 3.2-3.4 4.4M19.4 19.5q1.2 3.2 3.4 4.4"
            stroke="#fff3d7"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
          />
          <Eyes y={14} x={4.4} />
        </g>
      );
  }
}
