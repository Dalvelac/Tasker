import assert from 'node:assert/strict'
import test from 'node:test'
import { visit } from './fixtures.mjs'

test('a focus session survives navigation, reload, sleep and cancelling a reset', async (t) => {
  const page = await visit(t, '#/focus')
  await page.clock.install({ time: new Date('2027-05-11T13:00:00Z') })
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Stop session' }).click()
  await page.getByRole('button', { name: 'Keep session' }).click()
  await page.getByRole('button', { name: 'Pause' }).waitFor()
  await page.getByRole('link', { name: /Inbox$/ }).click()
  await page.clock.fastForward('03:00')
  await page.getByRole('link', { name: /Focus Timer$/ }).click()
  const timer = page.locator('.pomodoro-ring strong')
  assert.match(await timer.innerText(), /^2[67]:/)
  await page.reload()
  await page.getByRole('button', { name: 'Pause' }).click()
  const paused = await timer.innerText()
  await page.clock.fastForward('05:00')
  assert.equal(await timer.innerText(), paused)
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.clock.fastForward('30:00')
  await page.getByText('Session finished', { exact: true }).waitFor()
})
