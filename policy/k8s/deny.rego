package k8s.deny

default deny := []

is_workload {
  input.kind == "Deployment"
} else {
  input.kind == "StatefulSet"
} else {
  input.kind == "Rollout"
}

containers[c] {
  is_workload
  c := input.spec.template.spec.containers[_]
}

deny[msg] {
  c := containers[_]
  img := c.image
  endswith(img, ":latest")
  msg := sprintf("%s: image uses :latest (%s)", [input.metadata.name, img])
}

deny[msg] {
  c := containers[_]
  not c.resources
  msg := sprintf("%s: resources not set", [input.metadata.name])
}

deny[msg] {
  c := containers[_]
  r := c.resources
  not r.requests
  msg := sprintf("%s: resources.requests missing", [input.metadata.name])
}

deny[msg] {
  c := containers[_]
  r := c.resources
  not r.limits
  msg := sprintf("%s: resources.limits missing", [input.metadata.name])
}

deny[msg] {
  c := containers[_]
  not c.livenessProbe
  msg := sprintf("%s: livenessProbe missing", [input.metadata.name])
}

deny[msg] {
  c := containers[_]
  not c.readinessProbe
  msg := sprintf("%s: readinessProbe missing", [input.metadata.name])
}
