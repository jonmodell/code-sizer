import * as vscode from "vscode";
export function activate(context: vscode.ExtensionContext) {

  let disposable = vscode.commands.registerCommand(
    "codesizer.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from Code Sizer!");
    }
  );

  let countlines = vscode.commands.registerCommand(
    "codesizer.countLines",
    () => {
      // count the lines of code in the current file and display the result
      let editor = vscode.window.activeTextEditor;
      if (!editor) {
        return; // no open text editor
      }
      let doc = editor.document;
      let lineCount = doc.lineCount;
      let charCount = doc.getText().length;
      let wordCount = doc.getText().split(/\s+/).length;
      vscode.window.showInformationMessage(
        `Line count: ${lineCount}\nChar count: ${charCount}\nWord count: ${wordCount}`
      );
    }
  );

  let countFiles = vscode.commands.registerCommand(
    "codesizer.countFiles",
    async () => {
      // prompt the use to let us know to just start from the currently selected directory
      // or the entire project
      let options: vscode.QuickPickOptions = {
        placeHolder: "Select a directory to start counting from",
      };

      let items: vscode.QuickPickItem[] = [];
      items.push({
        label: "Current Directory",
        description: "Count files from the current directory",
      });
      items.push({
        label: "Project Directory",
        description: "Count files from the project directory",
      });
      items.push({
        label: "Custom Directory",
        description: "Count files from a custom directory",
      });
      items.push({ label: "Cancel", description: "Cancel the operation" });

      let startFrom: string = vscode.workspace.workspaceFolders?.[0].uri
        .fsPath as string;

      await vscode.window.showQuickPick(items, options).then((selection) => {
        switch (selection?.label) {
          case "Project Directory":
            return;
            
          case "Current Directory":
            // start from the directory of the currently selected file
            startFrom =
              vscode.window.activeTextEditor?.document.uri.fsPath
                .split("/")
                .slice(0, -1)
                .join("/") ?? startFrom;
            return;

          case "Cancel":
            return;
        }
      });

      
      // count the number of files in a project, excluding files in the .git folder and anything in the .gitignore file
      let workspace = vscode.workspace.workspaceFolders;
      if (!workspace) {
        return; // no open workspace
      }
      let fs = require("fs");
      let path = require("path");
      let count = 0;
      let gitignore: [string?] = [];
      let gitignorePath = path.join(workspace[0].uri.fsPath, ".gitignore");
      if (fs.existsSync(gitignorePath)) {
        gitignore = fs
          .readFileSync(gitignorePath)
          .toString()
          .split("\n")
          .filter((line: string) => line.length > 0 && !line.startsWith("#"));
      }

      const includedDirectories: [string?] = [];
      let walk = function (dir: string) {
        // do not walk files or folders in .gitignore
        const folderName = dir.split("/").slice(-1)[0];
        if (
					folderName === ".git" ||
          gitignore.includes(folderName) ||
          gitignore.includes(folderName + "/") ||
          gitignore.includes( "/" + folderName)
        ) {
          return;
        }

        // add this path to the included directories if it made it past the gitignore filter
        includedDirectories.push(dir);

        let files = fs.readdirSync(dir);
        for (let file of files) {
          if (gitignore.includes(file)) {
            continue;
          }

          let filePath = path.join(dir, file);
          let stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            walk(filePath);
          } else {
            count++;
          }
        }
      };

      walk(startFrom);
			// show the output as markup with colors and a formatted list of included directories
			let output = vscode.window.createOutputChannel("Code Sizer", "markdown");
			output.appendLine("Code Sizer Results");
			output.appendLine("=====================================");
			output.appendLine(`Total Files: ${count}`);
      output.appendLine("");
			output.appendLine(`Included Directories:`);
			output.appendLine(`-------------------------------------`);
			includedDirectories.forEach((dir) => {
				output.appendLine(dir || "");
			});

			output.show();
    }
  );

  // Add to a list of disposables which are disposed when this extension is deactivated.
  context.subscriptions.push(disposable, countlines, countFiles);
}

// This method is called when your extension is deactivated
export function deactivate() {
  console.log("Code Sizer is deactivated!");
}
