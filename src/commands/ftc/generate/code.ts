import { promises as fs } from 'node:fs';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import * as xml2js from 'xml2js';
import { Flow } from '../../../flow/Flow.js';
import { FlowParser, ParseTreeNode } from '../../../parse/FlowParser.js';
import { DefaultFtcFormatter } from '../../../format/DefaultFtcFormatter.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('flowtocode', 'ftc.generate.code');

export type FtcGenerateCodeResult = {
  path: string;
};

type ParsedXml = {
  Flow: Flow; // Replace 'any' with the actual type if known
};

export type FormatterInterface = {
  convertToPseudocode(node: ParseTreeNode, tabLevel?: number): string;
}
export default class FtcGenerateCode extends SfCommand<FtcGenerateCodeResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    file: Flags.string({
      summary: messages.getMessage('flags.file.summary'),
      char: 'f',
      required: true,
    }),
    output: Flags.string({
      summary: messages.getMessage('flags.output.summary'),
      char: 'd',
      required: false,
    }),
  };

  private static getOutputPath(filepath: string, outputDir?: string): string {
    if (outputDir) {
      const filename = filepath.split('/').pop()?.replace('.flow-meta.xml', '.ftc') ?? 'flow.ftc';
      return `${outputDir}/${filename}`;
    }
    return filepath.replace('.flow-meta.xml', '.ftc');
  }

  public async run(): Promise<FtcGenerateCodeResult> {
    const { flags } = await this.parse(FtcGenerateCode);

    const filepath: string = flags.file;
    const fileContent: string = await fs.readFile(filepath, 'utf-8');
    const parser: xml2js.Parser = new xml2js.Parser({ explicitArray: false });
    const flow: Flow = ((await parser.parseStringPromise(fileContent)) as ParsedXml).Flow;
    const flowParser: FlowParser = new FlowParser();
    const formatter: FormatterInterface = new DefaultFtcFormatter();
    const treeNode: ParseTreeNode = flowParser.parse(flow);
    const parseTree: string = formatter.convertToPseudocode(treeNode);
    const outputPath: string = FtcGenerateCode.getOutputPath(filepath, flags.output);
    await fs.writeFile(outputPath, parseTree, 'utf-8');
    this.log(`Output written to ${outputPath}`);
    return {
      path: outputPath,
    };
  }
}
