"use client";

import type { PieceKind } from "@animal-chess/game-core";
import { Droplets, Flag, ShieldAlert, Sparkles, X } from "lucide-react";

const PIECES: { kind: PieceKind; name: string; rank: number }[] = [
  { kind: "elephant", name: "Voi", rank: 8 },
  { kind: "lion", name: "Sư tử", rank: 7 },
  { kind: "tiger", name: "Hổ", rank: 6 },
  { kind: "leopard", name: "Báo", rank: 5 },
  { kind: "wolf", name: "Sói", rank: 4 },
  { kind: "dog", name: "Chó", rank: 3 },
  { kind: "cat", name: "Mèo", rank: 2 },
  { kind: "rat", name: "Chuột", rank: 1 }
];

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Luật chơi" onClick={onClose}>
      <div className="modal-card rules-card" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>
            <Sparkles /> Luật chơi Cờ Thú
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
            <X />
          </button>
        </header>

        <div className="rules-body">
          <section>
            <h3>Thứ bậc quân (mạnh → yếu)</h3>
            <div className="rank-table">
              {PIECES.map((p) => (
                <div key={p.kind} className="rank-row">
                  <span className="rank-chip">{p.rank}</span>
                  <strong>{p.name}</strong>
                </div>
              ))}
            </div>
            <p>
              Quân hạng cao ăn được quân hạng bằng hoặc thấp hơn. Ngoại lệ: Chuột (1) ăn được Voi (8), nhưng Voi không
              ăn được Chuột.
            </p>
          </section>

          <section>
            <h3>Địa hình &amp; nước đi</h3>
            <ul className="rules-list">
              <li>
                <Droplets />{" "}
                <span>
                  <strong>Sông:</strong> chỉ Chuột được xuống nước. Sư tử &amp; Hổ nhảy qua sông theo hàng/cột nếu không
                  bị Chuột chặn trên đường nước.
                </span>
              </li>
              <li>
                <ShieldAlert />{" "}
                <span>
                  <strong>Bẫy:</strong> quân địch đứng trên bẫy nhà bạn bị mất sức — quân nào của bạn cũng ăn được nó.
                </span>
              </li>
              <li>
                <Flag />{" "}
                <span>
                  <strong>Hang:</strong> không quân nào vào hang nhà mình. Đưa một quân vào hang đối thủ là thắng ngay.
                </span>
              </li>
            </ul>
            <p>Mỗi quân đi 1 ô theo chiều ngang hoặc dọc. Ăn quân khi đi vào ô có quân địch hợp lệ.</p>
          </section>

          <section>
            <h3>Thắng ván</h3>
            <ul className="rules-list">
              <li>
                <span>Vào được hang đối thủ, hoặc</span>
              </li>
              <li>
                <span>Ăn hết toàn bộ quân đối thủ.</span>
              </li>
            </ul>
          </section>
        </div>

        <footer className="modal-foot">
          <button type="button" onClick={onClose}>
            Đã hiểu
          </button>
        </footer>
      </div>
    </div>
  );
}
