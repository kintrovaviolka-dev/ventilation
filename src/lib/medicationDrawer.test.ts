import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MedicationDrawer } from '../components/MedicationDrawer';
import { createRuntime } from './simulationRuntime';

function renderMedicationDrawer(open: boolean) {
  return renderToStaticMarkup(createElement(MedicationDrawer, {
    language: 'en',
    open,
    onToggle: () => {},
    tick: 0,
    readState: () => createRuntime({fio2:40,rr:12,vt:500,pinsp:20,peep:5,ieRatio:'1:2',pSupport:10}),
    send: () => {},
    onAdminister: () => {},
  }));
}

test('opening the medication drawer presents an accessible package-selection dialog, not dose controls', () => {
  const markup = renderMedicationDrawer(true);

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /Choose a package, enter the administration, then confirm/);
  assert.match(markup, /Propofol/);
  assert.match(markup, /Sufentanil/);
  assert.match(markup, /Rocuronium/);
  assert.match(markup, /Norepinephrine/);
  assert.match(markup, /Atropine/);

  assert.match(markup, /not safe dosing ranges/i);
  assert.doesNotMatch(markup, /Record administration/);
  assert.doesNotMatch(markup, /type="number"/);
});

test('closing the medication drawer removes its modal from the page', () => {
  assert.doesNotMatch(renderMedicationDrawer(false), /role="dialog"/);
});
