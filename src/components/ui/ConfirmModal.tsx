'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'red' | 'green' | 'yellow';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'red',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    },
    [onCancel, onConfirm]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isVisible) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-500',
    green: 'bg-green-600 hover:bg-green-500',
    yellow: 'bg-yellow-500 hover:bg-yellow-400 text-gray-900',
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div
        className={`relative bg-gray-800 rounded-xl p-6 max-w-sm mx-4 border border-gray-600 shadow-2xl transform transition-all duration-200 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 ${colorClasses[confirmColor]} rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Custom hook for confirm modal
export function useConfirmModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'red' | 'green' | 'yellow';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirm = useCallback(
    (options: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      confirmColor?: 'red' | 'green' | 'yellow';
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        setModalState({
          isOpen: true,
          ...options,
          onConfirm: () => {
            setModalState((prev) => ({ ...prev, isOpen: false }));
            resolve(true);
          },
        });
      });
    },
    []
  );

  const handleCancel = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const ConfirmModalComponent = (
    <ConfirmModal
      isOpen={modalState.isOpen}
      title={modalState.title}
      message={modalState.message}
      confirmText={modalState.confirmText}
      cancelText={modalState.cancelText}
      confirmColor={modalState.confirmColor}
      onConfirm={modalState.onConfirm}
      onCancel={handleCancel}
    />
  );

  return { showConfirm, ConfirmModal: ConfirmModalComponent };
}

// Success/Info Modal Component
interface InfoModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  color?: 'green' | 'yellow' | 'blue' | 'red';
  onClose: () => void;
}

export function InfoModal({
  isOpen,
  title,
  message,
  buttonText = 'OK',
  color = 'green',
  onClose,
}: InfoModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isVisible) return null;

  const colorClasses = {
    green: 'bg-green-600 hover:bg-green-500',
    yellow: 'bg-yellow-500 hover:bg-yellow-400 text-gray-900',
    blue: 'bg-blue-600 hover:bg-blue-500',
    red: 'bg-red-600 hover:bg-red-500',
  };

  const iconColors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
  };

  const icons = {
    green: '✓',
    yellow: '★',
    blue: 'ℹ',
    red: '✕',
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className={`relative bg-gray-800 rounded-xl p-6 max-w-sm mx-4 border border-gray-600 shadow-2xl transform transition-all duration-200 ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`text-3xl ${iconColors[color]}`}>{icons[color]}</div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-300 mb-6">{message}</p>
        <button
          onClick={onClose}
          className={`w-full px-4 py-2 ${colorClasses[color]} rounded-lg font-medium transition-colors`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}

// Custom hook for info modal
export function useInfoModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    buttonText?: string;
    color?: 'green' | 'yellow' | 'blue' | 'red';
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const resolveRef = useRef<(() => void) | null>(null);

  const showInfo = useCallback(
    (options: {
      title: string;
      message: string;
      buttonText?: string;
      color?: 'green' | 'yellow' | 'blue' | 'red';
    }): Promise<void> => {
      return new Promise((resolve) => {
        setModalState({
          isOpen: true,
          ...options,
        });
        resolveRef.current = resolve;
      });
    },
    []
  );

  const handleClose = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  const InfoModalComponent = (
    <InfoModal
      isOpen={modalState.isOpen}
      title={modalState.title}
      message={modalState.message}
      buttonText={modalState.buttonText}
      color={modalState.color}
      onClose={handleClose}
    />
  );

  return { showInfo, InfoModal: InfoModalComponent };
}
