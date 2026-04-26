import { App, TerraformStack } from "cdktf";
import { Construct } from "constructs";

class __projectName__Stack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}

const app = new App();
new __projectName__Stack(app, "__projectName__");
app.synth();
