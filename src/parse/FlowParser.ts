/* eslint-disable no-param-reassign */
import * as Flow from '../flow/Flow.js';

export class ParseTreeNode {
  private statement: string;
  private parent?: ParseTreeNode;
  private flowElement?: Flow.FlowBaseElement;
  private children: ParseTreeNode[];

  public constructor(statement?: string, flowElement?: Flow.FlowBaseElement) {
    this.statement = statement ? statement : '';
    this.flowElement = flowElement;
    this.children = [];
  }

  public getStatement(): string {
    return this.statement;
  }

  public setStatement(statement: string): void {
    this.statement = statement;
  }

  public getParent(): ParseTreeNode | undefined {
    return this.parent;
  }

  public setParent(parent: ParseTreeNode | undefined): void {
    this.parent = parent;
  }

  public getFlowElement(): Flow.FlowBaseElement | undefined {
    return this.flowElement;
  }

  public setFlowElement(flowElement: Flow.FlowBaseElement | undefined): void {
    this.flowElement = flowElement;
  }

  public getChildren(): ParseTreeNode[] {
    return this.children;
  }

  public addChild(child: ParseTreeNode): void {
    this.children.push(child);
    child.setParent(this);
  }
}

export class FlowParser {
  private flowElementByName: Map<string, Flow.FlowBaseElement>;
  private flowLoopStack: Flow.FlowLoop[];
  private elementParseCount: Map<string, number>;

  public constructor() {
    this.flowElementByName = new Map<string, Flow.FlowBaseElement>();
    this.elementParseCount = new Map<string, number>();
    this.flowLoopStack = [];
  }

  public toPseudoCode(flow: Flow.Flow): string {
    const root = this.parse(flow);
    return this.convertToPseudocode(root);
  }

  public convertToPseudocode(node: ParseTreeNode, tabLevel: number = -1): string {
    let result = '';
    if (node.getStatement()) {
      result += `${'  '.repeat(tabLevel)}${node.getStatement()}\n`;
    }
    for (const child of node.getChildren()) {
      result += this.convertToPseudocode(child, tabLevel + 1);
    }
    return result;
  }

  public parse(flow: Flow.Flow): ParseTreeNode {
    this.flowElementByName = this.getFlowElementByName(flow);

    const startElement: Flow.FlowElement = this.getElementFromConnector(flow.start.connector);

    if (startElement) {
      const root = new ParseTreeNode();
      this.parseElement(root, startElement);
      return root;
    } else {
      throw new Error('No start element found');
    }
  }

  private parseElement(parentNode: ParseTreeNode, element: Flow.FlowElement): void {
    this.elementParseCount.set(element.name, (this.elementParseCount.get(element.name) ?? 0) + 1);

    if (this.flowLoopStack.includes(element as Flow.FlowLoop)) {
      // parentNode.addChild(new ParseTreeNode('END LOOP: ' + element.name, element));
      return;
    } else if ((this.elementParseCount.get(element.name) ?? 0) > 1) {
      parentNode.addChild(new ParseTreeNode('ALREADY OUTPUT: ' + element.name, element));
      return;
    } else if (Flow.isFlowActionCall(element)) {
      this.parseActionCallElement(parentNode, element);
    } else if (Flow.isFlowScreen(element)) {
      this.parseScreenElement(parentNode, element);
    } else if (Flow.isFlowLoop(element)) {
      this.flowLoopStack.push(element);
      this.parseLoopElement(parentNode, element);
      this.flowLoopStack.pop();
    } else if (Flow.isFlowDecision(element)) {
      this.parseDecisionElement(parentNode, element);
    } else if (Flow.isFlowAssignment(element)) {
      parentNode.addChild(new ParseTreeNode('ASSIGNMENT: ' + element.name, element));
      this.parseConnector(parentNode, element);
    } else if (Flow.isFlowSubflow(element)) {
      parentNode.addChild(new ParseTreeNode('SUBFLOW: ' + element.name, element));
      this.parseConnector(parentNode, element);
    } else {
      parentNode.addChild(new ParseTreeNode(element.name, element));
      this.parseConnector(parentNode, element);
    }
  }

  private parseActionCallElement(parentNode: ParseTreeNode, actionElement: Flow.FlowActionCall): void {
    const faultConnectorElement =
      actionElement.faultConnector != null ? this.getElementFromConnector(actionElement.faultConnector) : null;
    if (faultConnectorElement && parentNode.getFlowElement() !== faultConnectorElement) {
      // try references fault connector to avoid infinite recursion on above check
      const tryNode = new ParseTreeNode('try:', faultConnectorElement);
      parentNode.addChild(tryNode);
      // reduce parse count to allow fault connector to be parsed
      this.elementParseCount.set(actionElement.name, (this.elementParseCount.get(actionElement.name) ?? 1) - 1);
      this.parseElement(tryNode, actionElement);

      const catchNode = new ParseTreeNode('except:');
      parentNode.addChild(catchNode);
      this.parseElement(catchNode, faultConnectorElement);
    } else {
      parentNode.addChild(new ParseTreeNode('ACTION CALL: ' + actionElement.name, actionElement));
      this.parseConnector(parentNode, actionElement);
    }
  }

  private parseScreenElement(parentNode: ParseTreeNode, screenElement: Flow.FlowScreen): void {
    parentNode.addChild(new ParseTreeNode('SCREEN: ' + screenElement.name, screenElement));
    this.parseConnector(parentNode, screenElement);
  }

  private parseLoopElement(parentNode: ParseTreeNode, flowElement: Flow.FlowLoop): void {
    const loopNode = new ParseTreeNode('LOOP: ' + flowElement.name, flowElement);
    parentNode.addChild(loopNode);
    const nextValueElement = this.getElementFromConnector(flowElement.nextValueConnector);
    if (nextValueElement) {
      this.parseElement(loopNode, nextValueElement);
    }
    const noMoreValuesElement = this.getElementFromConnector(flowElement.noMoreValuesConnector);
    if (noMoreValuesElement) {
      this.parseElement(parentNode, noMoreValuesElement);
    }
  }

  private parseDecisionElement(parentNode: ParseTreeNode, flowElement: Flow.FlowDecision): void {
    const decision = new ParseTreeNode('DECISION: ' + flowElement.name, flowElement);
    parentNode.addChild(decision);
    for (const ruleElement of flowElement.rules) {
      this.parseRuleElement(decision, ruleElement);
    }
    if (flowElement.defaultConnector == null) {
      // const elseNode = new ParseTreeNode('END DECISION: ' + flowElement.name);
      // decision.addChild(elseNode);
    } else {
      const elseNode = new ParseTreeNode('DEFAULT:', this.getElementFromConnector(flowElement.defaultConnector));
      decision.addChild(elseNode);
      this.parseElement(elseNode, this.getElementFromConnector(flowElement.defaultConnector));
    }
  }

  private parseRuleElement(parentNode: ParseTreeNode, ruleElement: Flow.FlowRule): void {
    const ruleNode = new ParseTreeNode('CASE: ' + ruleElement.label, ruleElement);
    parentNode.addChild(ruleNode);
    this.parseConnector(ruleNode, ruleElement);
  }

  private parseConnector(
    parentNode: ParseTreeNode,
    element: Flow.FlowElement,
    connectorName: string = 'connector'
  ): void {
    if (connectorName in element) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const child = this.getElementFromConnector((element as any)[connectorName] as Flow.FlowConnector);
      if (child) {
        this.parseElement(parentNode, child);
      }
    }
  }

  private getElementFromConnector(connector: Flow.FlowConnector): Flow.FlowElement {
    if (!this.flowElementByName.has(connector.targetReference)) {
      throw new Error(`No element found with name ${connector.targetReference}`);
    } else {
      return this.flowElementByName.get(connector.targetReference) as Flow.FlowElement;
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private getFlowElementByName(flow: Flow.Flow): Map<string, Flow.FlowBaseElement> {
    const apiToFlowNode = new Map<string, Flow.FlowBaseElement>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type
    const addToMap = (elements: any[]) => {
      if (elements) {
        if (!Array.isArray(elements)) {
          elements = [elements];
        }
        for (const element of elements) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          apiToFlowNode.set(element.name, element);
        }
      }
    };

    if (flow.actionCalls) {
      addToMap(flow.actionCalls);
    }
    if (flow.apexPluginCalls) {
      addToMap(flow.apexPluginCalls);
    }
    if (flow.collectionProcessors) {
      addToMap(flow.collectionProcessors);
    }
    if (flow.screens) {
      addToMap(flow.screens);
    }
    if (flow.loops) {
      addToMap(flow.loops);
    }
    if (flow.assignments) {
      addToMap(flow.assignments);
    }
    if (flow.decisions) {
      if (!Array.isArray(flow.decisions)) {
        flow.decisions = [flow.decisions];
      }
      addToMap(flow.decisions);

      for (const decision of flow.decisions) {
        if (!Array.isArray(decision.rules)) {
          decision.rules = [decision.rules];
        }
      }
    }
    if (flow.recordLookups) {
      addToMap(flow.recordLookups);
    }
    if (flow.recordRollbacks) {
      addToMap(flow.recordRollbacks);
    }
    if (flow.recordCreates) {
      addToMap(flow.recordCreates);
    }
    if (flow.recordUpdates) {
      addToMap(flow.recordUpdates);
    }
    if (flow.recordDeletes) {
      addToMap(flow.recordDeletes);
    }
    if (flow.subflows) {
      addToMap(flow.subflows);
    }

    return apiToFlowNode;
  }
}
