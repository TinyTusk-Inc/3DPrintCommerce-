/**
 * ConfirmModal
 * A lightweight confirmation dialog that renders inline (no portal needed).
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *
 *   // Trigger:
 *   setConfirm({
 *     message: 'Delete this product?',
 *     onConfirm: () => handleDelete(id)
 *   });
 *
 *   // Render:
 *   {confirm && (
 *     <ConfirmModal
 *       message={confirm.message}
 *       onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
 *       onCancel={() => setConfirm(null)}
 *     />
 *   )}
 */

import React from 'react';

function ConfirmModal({ message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true, onConfirm, onCancel }) {
  return (
    // Backdrop
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}
    >
      {/* Dialog */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '10px',
          padding: '28px 32px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
        }}
      >
        <p style={{ fontSize: '16px', marginBottom: '24px', color: '#2c3e50', lineHeight: '1.5' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ minWidth: '80px' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn"
            style={{
              minWidth: '80px',
              background: danger ? '#e74c3c' : '#3498db',
              color: '#fff',
              border: 'none'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
