'use strict';

import * as vsc from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let StreamZip = require('node-stream-zip');

let pths = [
  'META-INF/spring-configuration-metadata.json',
  'META-INF/additional-spring-configuration-metadata.json'];

let items: vsc.CompletionItem[] = [];

class Server implements vsc.CompletionItemProvider, vsc.HoverProvider {

  provideCompletionItems(document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken): vsc.CompletionList {
    return new vsc.CompletionList(items);
  }

  resolveCompletionItem(item: vsc.CompletionItem, token: vsc.CancellationToken): vsc.CompletionItem {
    return null;
  }

  provideHover(document: vsc.TextDocument, position: vsc.Position, token: vsc.CancellationToken): vsc.Hover {
    return null;
  }
}

function parse(data: any): void {
  for (let property of data.properties) {
    let item = new vsc.CompletionItem(property.name);
    item.detail = property.defaultValue + '  [' + property.type + ']';
    item.documentation = property.description;
    if (property.deprecation) {
      item.documentation += ' DEPRECATED';
      if (property.deprecation.replacement) {
        item.documentation += ' Use ' + property.deprecation.replacement;
      }
    }
    items.push(item);
  }
}

function scan(uri: vsc.Uri): void {
  fs.readFile(uri.fsPath, 'utf8', function (err, data) {
    if (err) {
      return;
    }
    items = [];

    let jps = data.split(path.delimiter);
    for (let jp of jps) {
      let zip = new StreamZip({
        file: jp,
        storeEntries: true
      });
      zip.on('ready', function () {
        for (let pth of pths) {
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
      zip.on('error', function (err) {
        return;
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

    context.subscriptions.push(vsc.languages.setLanguageConfiguration('ini', {
      wordPattern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g
    }));

    let server = new Server();
    context.subscriptions.push(vsc.languages.registerCompletionItemProvider(['ini'], server));
    context.subscriptions.push(vsc.languages.registerHoverProvider(['ini'], server));
  }
}

export function deactivate() {
}
