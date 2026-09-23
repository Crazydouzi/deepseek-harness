/**
 * The `require` the browser module loader injects into every plugin factory. It
 * answers bare specifiers from the module table, and `async` loads one
 * package-local chunk published beside the requesting bundle. The client
 * compiler shape carries no ambient node types, so this declaration is the only
 * one in scope.
 */
declare const require: {
  /**
   * Load one package-local chunk by its published name.
   * @param specifier - a `./client.<name>.js` request.
   * @returns the chunk's exports.
   */
  async(specifier: string): Promise<unknown>
}
