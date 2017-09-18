/* @flow */

import FS from 'fs'
import Path from 'path'
import pMap from 'p-map'
import invariant from 'assert'
import promisify from 'sb-promisify'

const stat = promisify(FS.stat)
const readdir = promisify(FS.readdir)

type Result = { files: Array<string>, directories: Array<string> }

async function scanDirectoryInternal(path: string, recursive: 0 | 1 | 2, validate: ((path: string) => boolean), result: Result): Promise<void> {
  const itemStat = await stat(path)
  if (itemStat.isFile()) {
    result.files.push(path)
  } else if (itemStat.isDirectory()) {
    result.directories.push(path)
  }
  if (!itemStat.isDirectory() || recursive === 0) {
    return
  }
  const contents = await readdir(path)
  await pMap(contents, async (item) => {
    const itemPath = Path.join(path, item)
    if (validate(itemPath)) {
      await scanDirectoryInternal(itemPath, recursive === 1 ? 0 : 2, validate, result)
    }
  })
}

async function scanDirectory(path: string, givenRecursive: boolean = true, givenValidate: ?((path: string) => boolean) = null): Promise<Result> {
  invariant(path && typeof path === 'string', 'path must be a valid string')
  invariant(!givenValidate || typeof givenValidate === 'function', 'validate must be a valid function')

  const recursive = !!givenRecursive
  const validate = givenValidate || function(itemPath) {
    return Path.basename(itemPath).substr(0, 1) !== '.'
  }

  const result = { files: [], directories: [] }
  await scanDirectoryInternal(path, recursive ? 2 : 1, validate, result)
  return result
}

export default scanDirectory
