import ec2 = require('@aws-cdk/aws-ec2');
import events = require('@aws-cdk/aws-events');
import cdk = require('@aws-cdk/cdk');
import ecs = require('../../lib');

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-ecs-integ-ecs');

const vpc = new ec2.VpcNetwork(stack, 'Vpc', { maxAZs: 1 });

const cluster = new ecs.Cluster(stack, 'EcsCluster', { vpc });
cluster.addDefaultAutoScalingGroupCapacity({
  instanceType: new ec2.InstanceType('t2.micro')
});

/// !show
// Create a Task Definition for the container to start
const taskDefinition = new ecs.Ec2TaskDefinition(stack, 'TaskDef');
taskDefinition.addContainer('TheContainer', {
  image: ecs.ContainerImage.fromAsset(stack, 'EventImage', { directory: 'eventhandler-image' }),
  memoryLimitMiB: 256,
  logging: new ecs.AwsLogDriver(stack, 'TaskLogging', { streamPrefix: 'EventDemo' })
});

// An EventRule that describes the event trigger (in this case a scheduled run)
const rule = new events.EventRule(stack, 'Rule', {
  scheduleExpression: 'rate(1 minute)',
});

// Use Ec2TaskEventRuleTarget as the target of the EventRule
const target = new ecs.Ec2TaskEventRuleTarget(stack, 'EventTarget', {
  cluster,
  taskDefinition,
  taskCount: 1
});

// Pass an environment variable to the container 'TheContainer' in the task
rule.addTarget(target, {
  jsonTemplate: JSON.stringify({
    containerOverrides: [{
      name: 'TheContainer',
      environment: [{ name: 'I_WAS_TRIGGERED', value: 'From CloudWatch Events' }]
    }]
  })
});
/// !hide

app.run();
