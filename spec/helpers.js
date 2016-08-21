/* @flow */

export async function expectToThrow(callback: (() => Promise<void>), message: string) {
  try {
    await callback()
    throw new Error('Function did not throw an error')
  } catch (error) {
    expect(error.message).toBe(message)
  }
}
