/* @flow */

import FS from 'fs'
import Path from 'path'
import invariant from 'assert'
import promisify from 'sb-promisify'

const stat = promisify(FS.stat)
const readdir = promisify(FS.readdir)

async function scanDirectory(path: string, recursive: 0 | 1 | 2, validate: ((path: string) => boolean)): Promise<Array<string>> {
  const itemStat = await stat(path)
  if (itemStat.isFile()) {
    return [path]
  }
  if (!itemStat.isDirectory() || recursive === 0) {
    return []
  }
  const contents = await readdir(path)
  const results = await Promise.all(contents.map(function(item) {
    const itemPath = Path.join(path, item)
    if (validate(itemPath)) {
      return scanDirectory(itemPath, recursive === 1 ? 0 : 2, validate)
    }
    return []
  }))
  return results.reduce(function(toReturn, current) {
    return toReturn.concat(current)
  }, [])
}

module.exports = async function(path: string, givenRecursive: boolean = true, givenValidate: ?((path: string) => boolean) = null) {
  invariant(path && typeof path === 'string', 'path must be a valid string')
  invariant(!givenValidate || typeof givenValidate === 'function', 'validate must be a valid function')

  const recursive = !!givenRecursive
  const validate = givenValidate || function(itemPath) {
    return Path.basename(itemPath).substr(0, 1) !== '.'
  }

  return scanDirectory(path, recursive ? 2 : 1, validate)
}
