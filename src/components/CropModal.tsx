import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { getCroppedBlob, Area } from "../cropImage";

export function CropModal({
  src,
  onCancel,
  onDone,
}: {
  src: string;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const confirm = async () => {
    if (!area) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, area);
      onDone(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="modal__panel" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Position your photo</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Drag to move, pinch or use the slider to zoom. Only the square is used.
        </p>
        <div className="crop__area">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
          />
        </div>
        <input
          className="crop__zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <div className="row" style={{ gap: 10, marginTop: 12 }}>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn--primary" onClick={confirm} disabled={busy}>
            {busy ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
