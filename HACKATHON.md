# HACKATHON.md

## Team name

loneCommiter

## Team members

- Yashvardhan Mundhra

## Problem statement

Problem 5: Automated Documentation Drift Detection

### Overview
Documentation frequently becomes incorrect when the underlying source code changes. Examples include renamed configuration flags, changed default values, modified API parameters, removed features, and behavioral shifts where explanatory prose still describes the previous implementation.

DriftLens analyzes code changes introduced through pull requests, identifies documentation associated with modified code, detects outdated configuration descriptions and API references, highlights exact documentation sentences affected, links each detected issue to the corresponding code change, and integrates with GitHub pull request workflows.

## Models we use and why

- Qwen 2.5 7B: Used to semantically determine whether documentation statements became factually incorrect because of a code change, distinguishing genuine semantic drift from non-breaking internal changes.

## Coding agent

Antigravity
