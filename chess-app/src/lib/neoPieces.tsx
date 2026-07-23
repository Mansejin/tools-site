import type { PieceRenderObject } from 'react-chessboard';

const KEYS = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'] as const;

/** Chess.com Neo piece set (bundled under public/pieces/neo). */
export const neoPieces: PieceRenderObject = Object.fromEntries(
  KEYS.map((key) => {
    const file = `${key[0]!.toLowerCase()}${key[1]!.toLowerCase()}.png`;
    const src = `${import.meta.env.BASE_URL}pieces/neo/${file}`;
    return [
      key,
      () => (
        <img
          src={src}
          alt={key}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            display: 'block',
          }}
        />
      ),
    ];
  }),
) as PieceRenderObject;
