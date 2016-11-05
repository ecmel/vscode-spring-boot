'use strict';

import * as vsc from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let StreamZip = require('node-stream-zip');

let paths = [
  'META-INF/spring-configuration-metadata.json',
  'META-INF/additional-spring-configuration-metadata.json'];

let items: { [index: string]: vsc.CompletionItem; } = {};

class Server implements vsc.CompletionItemProvider, vsc.HoverProvider {

  private isValue(document: vsc.TextDocument, position: vsc.Position): boolean {
    let start = new vsc.Position(position.line, 0);
    let range = new vsc.Range(start, position);
    let text = document.getText(range);
    return text.includes('=') || text.includes(':');
  }

  provideCompletionItems(document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken): vsc.CompletionList {
    if (this.isValue(document, position)) {
      return null;
    }
    let ci: vsc.CompletionItem[] = [];
    for (let item in items) {
      ci.push(items[item]);
    }
    return new vsc.CompletionList(ci);
  }

  resolveCompletionItem(item: vsc.CompletionItem, token: vsc.CancellationToken): vsc.CompletionItem {
    return item;
  }

  provideHover(document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken): vsc.Hover {
    let line = document.lineAt(position.line);
    let pair = line.text.split(/[\=\:]/);
    if (pair.length > 0) {
      if (pair[0].endsWith('.')) {
        pair[0] = pair[0].slice(0, -1);
      }      
      let ci = items[pair[0]];
      if (ci) {
        return new vsc.Hover(ci.documentation + '\nDefault: ' + ci.detail);
      }
    }
    return null;
  }
}

function parse(data: any): void {
  for (let property of data.properties) {
    let item = items[property.name];
    if (item && item.documentation) {
      continue;
    }
    item = new vsc.CompletionItem(property.name);
    item.detail = property.defaultValue + '  [' + property.type + ']';
    item.documentation = property.description;
    if (property.deprecation) {
      item.documentation += ' DEPRECATED';
      if (property.deprecation.replacement) {
        item.documentation += ' use ' + property.deprecation.replacement;
      }
    }
    items[property.name] = item;
  }
}

function scan(uri: vsc.Uri): void {
  fs.readFile(uri.fsPath, 'utf8', function (err, data) {
    items = {};

    if (err) {
      console.log(err);
      return;
    }
    let jps = data.split(path.delimiter);

    for (let jp of jps) {
      let zip = new StreamZip({
        file: jp,
        storeEntries: true
      });
      zip.on('ready', function () {
        for (let pth of paths) {
          let md = zip.entry(pth);
          if (md) {
            try {
              parse(JSON.parse(zip.entryDataSync(md.name)))
            } catch (error) {
              console.log(error);
            }
          }
        }
      });
      zip.on('error', function (error) {
        console.log(error);
      });
    }
  });
}

export function activate(context: vsc.ExtensionContext) {
  if (vsc.workspace.rootPath) {
    let cp = path.resolve(vsc.workspace.rootPath, 'classpath.txt');
    scan(vsc.Uri.file(cp));

    let fsw = vsc.workspace.createFileSystemWatcher(cp);
    fsw.onDidCreate(scan);
    fsw.onDidChange(scan);
    fsw.onDidDelete(scan);
    context.subscriptions.push(fsw);

    context.subscriptions.push(vsc.languages.setLanguageConfiguration('properties', {
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\<\>\/\?\s]+)/g
    }));

    let server = new Server();
    context.subscriptions.push(vsc.languages.registerCompletionItemProvider(['properties'], server));
    context.subscriptions.push(vsc.languages.registerHoverProvider(['properties'], server));
  }
}

export function deactivate() {
}
