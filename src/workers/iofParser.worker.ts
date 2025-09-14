/// <reference lib="webworker" />

import { parseIOFXML } from '@/utils/iof';
import { ensureIndex } from '@/utils/storage';

export type WorkerRequest = {
  type: 'parse';
  fileText: string; // conteúdo do XML
};

export type WorkerResponse =
  | { type: 'success'; event: any }
  | { type: 'error'; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (msg.type === 'parse') {
    try {
      // faz o parse (usa seu parseIOFXML normal)
      const ev = parseIOFXML(msg.fileText);
      // garante índice (caso parseIOFXML não já injete)
      ensureIndex(ev);

      const res: WorkerResponse = { type: 'success', event: ev };
      (self as any).postMessage(res);
    } catch (err: any) {
      const res: WorkerResponse = {
        type: 'error',
        message: err?.message || String(err),
      };
      (self as any).postMessage(res);
    }
  }
};