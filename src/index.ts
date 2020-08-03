/* @flow */

import fs from 'fs'
import fsPath from 'path'
import invariant from 'assert'
import { PromiseQueue } from 'sb-promise-queue'

interface Result {
  files: Array<string>
  directories: Array<string>
}

interface FileSystem {
  join(pathA: string, pathB: string): string
  basename(path: string): string
  stat(path: string): Promise<fs.Stats>
  readdir(path: string): Promise<string[]>
}

type Validate = (path: string) => boolean
type Recursive = 'shallow' | 'deep' | 'none'

export const defaultFilesystem: FileSystem = {
  join(pathA, pathB) {
    return fsPath.join(pathA, pathB)
  },
  basename(path) {
    return fsPath.basename(path)
  },
  stat(path) {
    return new Promise((resolve, reject) => {
      fs.stat(path, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  },
  readdir(path) {
    return new Promise((resolve, reject) => {
      fs.readdir(path, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      })
    })
  },
}

async function scanDirectoryInternal({
  path,
  recursive,
  validate,
  result,
  fileSystem,
  queue,
  reject,
}: {
  path: string
  recursive: Recursive
  validate: Validate
  result: Result
  fileSystem: FileSystem
  queue: PromiseQueue
  reject: (err: Error) => void
}): Promise<void> {
  const itemStat = await fileSystem.stat(path)
  if (itemStat.isFile()) {
    result.files.push(path)
  } else if (itemStat.isDirectory()) {
    result.directories.push(path)
  }

  if (!itemStat.isDirectory() || recursive === 'none') {
    return
  }

  const contents = await fileSystem.readdir(path)
  contents.forEach((item) => {
    const itemPath = fileSystem.join(path, item)

    if (!validate(itemPath)) {
      return
    }

    queue
      .add(() =>
        scanDirectoryInternal({
          path: itemPath,
          recursive: recursive === 'shallow' ? 'none' : 'deep',
          validate,
          result,
          fileSystem,
          queue,
          reject,
        }),
      )
      .catch(reject)
  })
}

async function scanDirectory(
  path: string,
  {
    recursive = true,
    validate = null,
    concurrency = Infinity,
    fileSystem = defaultFilesystem,
  }: {
    recursive?: boolean
    validate?: Validate | null
    concurrency?: number
    fileSystem?: Partial<FileSystem>
  } = {},
): Promise<Result> {
  invariant(path && typeof path === 'string', 'path must be a valid string')
  invariant(typeof recursive === 'boolean', 'options.recursive must be a valid boolean')
  invariant(validate === null || typeof validate === 'function', 'options.validate must be a valid function')
  invariant(typeof concurrency === 'number', 'options.concurrency must be a valid number')
  invariant(fileSystem !== null && typeof fileSystem === 'object', 'options.fileSystem must be a valid object')

  const queue = new PromiseQueue({
    concurrency,
  })

  const result = { files: [], directories: [] }
  const mergedFileSystem = { ...defaultFilesystem, ...fileSystem }

  await new Promise((resolve, reject) => {
    scanDirectoryInternal({
      path,
      recursive: recursive ? 'deep' : 'shallow',
      validate: validate != null ? validate : (item) => mergedFileSystem.basename(item).slice(0, 1) !== '.',
      result,
      fileSystem: mergedFileSystem,
      queue,
      reject,
    })
      .then(() => queue.waitTillIdle())
      .then(resolve, reject)
  })

  return result
}

export default scanDirectory
