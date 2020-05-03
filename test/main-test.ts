import test from 'ava'
import fsPath from 'path'
import scanDirectory, { defaultFilesystem } from '../src'

function getFixturePath(path: string) {
  return fsPath.join(__dirname, 'fixtures', path)
}

test('it validates path arg', async t => {
  // @ts-ignore
  await t.throwsAsync(() => scanDirectory(), null, 'path must be a valid string')
  // @ts-ignore
  await t.throwsAsync(() => scanDirectory({}), null, 'path must be a valid string')
  // @ts-ignore
  await t.throwsAsync(() => scanDirectory(null), null, 'path must be a valid string')

  await t.notThrowsAsync(() => scanDirectory(__dirname))
})

test('it validates recursive arg', async t => {
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { recursive: null }),
    null,
    'options.recursive must be a valid boolean',
  )
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { recursive: {} }),
    null,
    'options.recursive must be a valid boolean',
  )
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { recursive: 'something' }),
    null,
    'options.recursive must be a valid boolean',
  )

  await t.notThrowsAsync(() => scanDirectory(__dirname, { recursive: true }))
})

test('it validates validate arg', async t => {
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { validate: {} }),
    null,
    'options.validate must be a valid function',
  )
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { validate: false }),
    null,
    'options.validate must be a valid function',
  )
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { validate: 'something' }),
    null,
    'options.validate must be a valid function',
  )

  await t.notThrowsAsync(() => scanDirectory(__dirname, { validate: null }))
  await t.notThrowsAsync(() =>
    scanDirectory(__dirname, {
      validate() {
        return true
      },
    }),
  )
})

test('it validates concurrency arg', async t => {
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { concurrency: {} }),
    null,
    'options.concurrency must be a valid number',
  )
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { concurrency: false }),
    null,
    'options.concurrency must be a valid number',
  )
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { concurrency: 'something' }),
    null,
    'options.concurrency must be a valid number',
  )

  await t.notThrowsAsync(() => scanDirectory(__dirname, { concurrency: Infinity }))
  await t.notThrowsAsync(() => scanDirectory(__dirname, { concurrency: 1 }))
})

test('it validates fileSystem arg', async t => {
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { fileSystem: null }),
    null,
    'options.fileSystem must be a valid object',
  )
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { fileSystem: false }),
    null,
    'options.fileSystem must be a valid object',
  )
  await t.throwsAsync(
    // @ts-ignore
    () => scanDirectory(__dirname, { fileSystem: 'something' }),
    null,
    'options.fileSystem must be a valid object',
  )

  const paths = []
  await t.notThrowsAsync(() => scanDirectory(__dirname, { fileSystem: {} }))
  await t.notThrowsAsync(() =>
    scanDirectory(getFixturePath('recursive'), {
      fileSystem: {
        readdir(path) {
          paths.push(path)
          return defaultFilesystem.readdir(path)
        },
      },
    }),
  )
  t.deepEqual(paths.map(item => item.replace(__dirname, '')), ['/fixtures/recursive', '/fixtures/recursive/b'])
})

test('it properly scans a given directory', async t => {
  const result = await scanDirectory(getFixturePath('normal'))
  t.deepEqual(result, {
    files: [getFixturePath('normal/a'), getFixturePath('normal/b')],
    directories: [getFixturePath('normal')],
  })
})

test('it ignores dot files by default', async t => {
  const results = await scanDirectory(getFixturePath('ignore-default'))
  t.deepEqual(results, {
    files: [getFixturePath('ignore-default/a'), getFixturePath('ignore-default/c')],
    directories: [getFixturePath('ignore-default')],
  })
})

test('recurses when we tell it to', async t => {
  const results = await scanDirectory(getFixturePath('recursive'))
  t.deepEqual(results.files, [getFixturePath('recursive/a'), getFixturePath('recursive/b/c')])
  t.deepEqual(results.directories, [getFixturePath('recursive'), getFixturePath('recursive/b')])
})

test('does not recurse when we tell it to', async t => {
  const results = await scanDirectory(getFixturePath('recursive'), { recursive: false })
  t.deepEqual(results.files, [getFixturePath('recursive/a')])
  t.deepEqual(results.directories, [getFixturePath('recursive'), getFixturePath('recursive/b')])
})

test('has a working validate method', async t => {
  const results = await scanDirectory(getFixturePath('validate'), {
    recursive: true,
    validate(path) {
      const baseName = fsPath.basename(path)
      return baseName !== 'd' && baseName !== 'g'
    },
  })
  t.deepEqual(results.files, [
    getFixturePath('validate/a'),
    getFixturePath('validate/b/c'),
    getFixturePath('validate/b/e/f'),
  ])
  t.deepEqual(results.directories, [
    getFixturePath('validate'),
    getFixturePath('validate/b'),
    getFixturePath('validate/b/e'),
  ])
})
