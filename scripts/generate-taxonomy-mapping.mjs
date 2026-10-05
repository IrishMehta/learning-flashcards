import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = "https://flashcards-omega-swart.vercel.app/api/flashcards";
const OUTPUT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../data/flashcard-taxonomy-mapping.json",
);

const hasKey = (card, keys) => keys.includes(card.cardKey);
const startsWithAny = (value, prefixes) => prefixes.some((prefix) => value.startsWith(prefix));
const taxonomy = (newTopic, newSubtopic, reviewNote) => ({ newTopic, newSubtopic, reviewNote });

function classifyMachineLearning(card) {
  const key = card.cardKey;

  if (hasKey(card, ["tf-idf-intuition"])) return taxonomy("data_preparation", "text_features");
  if (hasKey(card, ["bias-variance-tradeoff", "cross-validation-purpose-leakage"])) {
    return taxonomy("model_evaluation", "generalization_and_validation");
  }
  if (hasKey(card, ["class-imbalance-vs-rare-event", "class-imbalance-evaluation", "class-imbalance-training-strategies"])) {
    return taxonomy("data_preparation", "class_imbalance");
  }
  if (hasKey(card, [
    "confidence-score-threshold-business-cost",
    "model-calibration",
    "threshold-tuning-vs-separability",
    "selective-prediction-abstention",
    "confidence-vs-uncertainty",
    "probability-calibration-logistic-regression",
    "classification-threshold-selection",
  ])) return taxonomy("model_evaluation", "thresholds_calibration_and_uncertainty");
  if (hasKey(card, ["classification-metric-selection", "roc-auc-vs-pr-auc"])) {
    return taxonomy("model_evaluation", "classification_metrics");
  }
  if (hasKey(card, ["mse-rmse-r2"])) return taxonomy("model_evaluation", "regression_metrics");
  if (hasKey(card, ["model-selection-principles"])) return taxonomy("model_evaluation", "model_selection");
  if (hasKey(card, ["offline-model-evaluation-checks"])) return taxonomy("model_evaluation", "evaluation_workflows");

  if (hasKey(card, [
    "conv2d-kernel-feature-map",
    "convolution-weights-learned",
    "stride-padding-kernel-intuition",
    "max-pooling-purpose",
    "cnn-feature-hierarchy",
    "receptive-field-depth",
    "small-vs-large-convolutions",
    "resnet-degradation-problem",
    "residual-learning-equation",
    "resnet-gradient-flow",
    "resnet-refinement-intuition",
    "cnn-layer-pipeline",
    "conv2d-channel-kernel-structure",
  ])) return taxonomy("computer_vision", "convolutional_neural_networks");
  if (hasKey(card, ["cv-task-comparison", "task-heads-classification-segmentation-detection"])) {
    return taxonomy("computer_vision", "vision_tasks_and_heads");
  }
  if (startsWithAny(key, ["segmentation-"]) || hasKey(card, ["unet-encoder-decoder", "unet-skip-concat", "upsampling-interpolation-vs-transpose-conv", "pixel-accuracy-imbalance", "iou-vs-dice", "cross-entropy-vs-dice-loss"])) {
    return taxonomy("computer_vision", "image_segmentation");
  }
  if (hasKey(card, [
    "detection-classification-localization",
    "bounding-box-parameterizations",
    "bbox-regression-losses",
    "nms-process",
    "nms-threshold-tradeoff",
    "anchor-boxes",
    "objectness-vs-class-confidence",
    "average-precision-process",
    "map-iou-threshold",
  ])) return taxonomy("computer_vision", "object_detection");
  if (hasKey(card, ["cnn-vs-vit-inductive-bias", "vit-input-pipeline", "vit-global-context"])) {
    return taxonomy("computer_vision", "vision_transformers");
  }
  if (hasKey(card, ["transfer-learning-freeze-vs-finetune", "scratch-vs-transfer-learning"])) {
    return taxonomy("deep_learning", "transfer_learning");
  }

  if (key.includes("batchnorm") || key.includes("layernorm") || hasKey(card, ["gamma-beta-after-normalization", "image-input-scaling-vs-batchnorm"])) {
    return taxonomy("deep_learning", "normalization");
  }
  if (hasKey(card, ["classification-loss-selection", "common-pytorch-loss-functions"])) {
    return taxonomy("deep_learning", "loss_functions");
  }
  if (hasKey(card, ["relu-and-leaky-relu"]) || /^(sigmoid|tanh|relu|leaky-relu|elu-|gelu-|swish-|choose-output-activation|softmax-|linear-output)/.test(key)) {
    return taxonomy("deep_learning", "activation_functions");
  }
  if (hasKey(card, ["positional-embedding-approaches"])) return taxonomy("deep_learning", "positional_representations");

  if (hasKey(card, ["subgradients-for-nonsmooth-ml-functions"])) return taxonomy("optimization", "gradient_based_optimization");
  if (hasKey(card, ["newton-second-order-optimization", "second-order-vs-first-order-training"])) {
    return taxonomy("optimization", "second_order_methods");
  }
  if (hasKey(card, [
    "batch-sgd-mini-batch-comparison",
    "sgd-core-update-and-tradeoffs",
    "mini-batch-vs-single-sample-vs-full-batch",
    "batch-gradient-averaging",
    "momentum-reduces-sgd-oscillation",
  ])) return taxonomy("optimization", "gradient_descent");
  if (/^(adagrad-|rmsprop-|adam-|adamw-)/.test(key)) return taxonomy("optimization", "adaptive_optimizers");
  if (hasKey(card, ["sgd-adam-adamw", "choose-sgd-adam-or-adamw"])) return taxonomy("optimization", "optimizer_selection");

  if (startsWithAny(key, ["linear-regression-"]) || hasKey(card, [
    "handle-linear-regression-assumption-violations",
    "normal-equation-vs-gradient-descent",
    "convexity-linear-regression",
    "ridge-vs-lasso",
    "why-l1-produces-sparsity",
    "regularization-constraint-geometry",
    "regularization-optimum-tangency",
    "vif-multicollinearity",
  ])) return taxonomy("supervised_learning", "linear_regression");
  if (startsWithAny(key, ["logistic-"]) || hasKey(card, [
    "why-not-linear-regression-classification",
    "linearity-in-logit",
    "log-loss-and-likelihood",
    "complete-separation-logistic-regression",
    "diagnose-logistic-regression-issues",
    "vif-logistic-regression",
    "logistic-regression-vs-tree-models",
  ])) return taxonomy("supervised_learning", "logistic_regression");
  if (startsWithAny(key, ["xgboost-"])) return taxonomy("supervised_learning", "gradient_boosting");

  if (startsWithAny(key, ["kmeans-"]) || hasKey(card, ["choosing-k-elbow-silhouette", "silhouette-score-intuition"])) {
    return taxonomy("unsupervised_learning", "k_means");
  }
  if (startsWithAny(key, ["dbscan-"]) || hasKey(card, ["kmeans-vs-dbscan"])) return taxonomy("unsupervised_learning", "dbscan");
  if (key.includes("hierarchical-clustering") || key.startsWith("hierarchical-linkage") || key.startsWith("agglomerative-")) {
    return taxonomy("unsupervised_learning", "hierarchical_clustering");
  }

  if (hasKey(card, [
    "normalization-vs-standardization",
    "choose-feature-scaling-method",
    "fit-scaler-training-data-only",
    "robust-scaling-outliers",
    "unit-vector-normalization",
    "max-abs-sparse-data",
    "standardize-before-pca",
    "minmax-out-of-range-inference",
    "clipping-vs-scaling",
    "gradient-descent-standardization-claim",
    "feature-scaling",
  ])) return taxonomy("data_preparation", "feature_scaling");
  if (hasKey(card, ["weak-semi-transfer-active-learning"])) return taxonomy("data_preparation", "label_scarcity");
  if (hasKey(card, ["data-augmentation-strategies"])) return taxonomy("data_preparation", "data_augmentation");
  if (hasKey(card, ["stemming-vs-lemmatization", "task-dependent-text-preprocessing"])) return taxonomy("data_preparation", "text_preprocessing");
  if (hasKey(card, ["missing-value-handling-without-leakage"])) return taxonomy("data_preparation", "missing_data");
  if (hasKey(card, ["feature-crossing-tradeoff"])) return taxonomy("data_preparation", "feature_interactions");
  if (startsWithAny(key, ["data-leakage", "detecting-data-leakage"]) || hasKey(card, ["time-series-splitting"])) {
    return taxonomy("data_preparation", "data_leakage");
  }
  if (hasKey(card, ["bandits-exploration-exploitation"])) return taxonomy("reinforcement_learning", "multi_armed_bandits");

  return null;
}

function classifyMathStatistics(card) {
  const key = card.cardKey;

  if (hasKey(card, [
    "roc-curve-and-fpr",
    "roc-auc-interpretation",
    "precision-recall-threshold-tradeoff",
    "choose-f1-roc-auc-pr-auc",
    "pr-auc-vs-roc-auc-imbalance",
    "recall-specificity-balanced-accuracy",
    "base-rate-effect-on-precision",
  ])) return taxonomy("model_evaluation", "classification_metrics");

  if (hasKey(card, ["span-intuition-and-dependence", "basis-definition", "linear-independence", "dimension-of-span"])) {
    return taxonomy("linear_algebra", "vector_spaces");
  }
  if (hasKey(card, ["norm-vector-size", "norm-versus-metric", "outer-product-intuition", "dot-product-versus-outer-product"])) {
    return taxonomy("linear_algebra", "vector_operations");
  }
  if (hasKey(card, ["covariance-as-outer-product", "interpret-one-centered-outer-product"])) return taxonomy("linear_algebra", "covariance_matrices");
  if (hasKey(card, ["matrices-as-linear-transformations", "matrix-inverse-conditions", "matrix-rank-intuition"])) {
    return taxonomy("linear_algebra", "matrices_and_transformations");
  }

  if (hasKey(card, ["gradient-versus-jacobian", "jacobian-role-in-backprop"])) return taxonomy("calculus", "multivariable_differentiation");
  if (hasKey(card, ["differentiability-local-linear-approximation", "absolute-value-nondifferentiability"])) return taxonomy("calculus", "differentiability");
  if (hasKey(card, ["convex-vs-concave-functions", "jensens-inequality-intuition"])) return taxonomy("calculus", "convex_analysis");

  if (hasKey(card, ["mean-vs-median-robustness", "variance-vs-standard-deviation", "variance-of-sum", "covariance-vs-correlation", "independence-vs-zero-correlation"])) {
    return taxonomy("descriptive_statistics", "summary_and_association");
  }
  if (hasKey(card, ["conditional-probability", "bayes-rule"])) return taxonomy("probability", "conditional_probability");
  if (hasKey(card, ["random-variable-distribution-expectation", "expectation-vs-variance"])) return taxonomy("probability", "random_variables");
  if (hasKey(card, ["bernoulli-vs-binomial", "binomial-assumptions-model-evaluation", "poisson-distribution-use", "normal-distribution"])) {
    return taxonomy("probability", "probability_distributions");
  }

  if (hasKey(card, [
    "population-sample-representativeness",
    "data-vs-sampling-distribution",
    "standard-error-intuition",
    "central-limit-theorem",
    "confidence-interval-interpretation",
    "bootstrap-uncertainty",
    "sampling-variability-vs-bias",
    "stratified-sampling-evaluation",
    "probability-vs-nonprobability-sampling",
    "reservoir-sampling",
    "importance-sampling",
  ])) return taxonomy("statistical_inference", "sampling_and_estimation");
  if (hasKey(card, [
    "statistical-vs-practical-significance",
    "null-alternative-hypothesis-testing",
    "p-value-interpretation",
    "alpha-decision-rule",
    "type-one-type-two-power",
    "one-sided-vs-two-sided-test",
    "multiple-comparisons-bonferroni-fdr",
    "confidence-interval-hypothesis-test-connection",
  ])) return taxonomy("statistical_inference", "hypothesis_testing");
  if (hasKey(card, [
    "confidence-interval-model-difference",
    "paired-vs-unpaired-comparison",
    "choose-model-comparison-test",
    "mcnemar-disagreement-test",
    "bootstrap-vs-permutation",
    "correlation-effective-sample-size",
  ])) return taxonomy("statistical_inference", "model_comparison");
  if (hasKey(card, [
    "experiment-control-treatment-randomization",
    "primary-secondary-guardrail-metrics",
    "experiment-decision-rule",
    "sample-size-effect-detection",
  ])) return taxonomy("experimentation", "experimental_design");

  return null;
}

function classifyMlSystems(card) {
  const key = card.cardKey;

  if (hasKey(card, ["batch-inference-model-loading"])) return taxonomy("model_serving", "batch_inference");
  if (hasKey(card, ["large-scale-feature-generation"])) return taxonomy("ml_data_infrastructure", "feature_pipelines");
  if (hasKey(card, ["point-in-time-correctness", "train-test-split-leakage"])) return taxonomy("ml_data_infrastructure", "data_quality_and_leakage");
  if (hasKey(card, ["data-centric-ai-loop"])) return taxonomy("ml_development", "data_centric_ai");
  if (hasKey(card, ["offline-vs-online-model-testing", "progressive-model-rollout", "shadow-ab-canary-comparison"])) {
    return taxonomy("model_deployment", "evaluation_and_rollouts");
  }
  if (hasKey(card, ["gradient-accumulation-effective-batch-size"])) return taxonomy("training_infrastructure", "training_efficiency");

  if (startsWithAny(key, ["lora-"]) || hasKey(card, ["peft-vs-full-finetuning"])) {
    return taxonomy("model_optimization", "parameter_efficient_finetuning");
  }
  if (key.includes("distillation")) return taxonomy("model_optimization", "knowledge_distillation");
  if (key.includes("pruning")) return taxonomy("model_optimization", "pruning");
  if (hasKey(card, ["quantization-benefits", "quantization-error-tradeoff", "ptq-vs-qat", "qat-low-precision-misconception"])) {
    return taxonomy("model_optimization", "quantization");
  }
  if (hasKey(card, ["model-compression-techniques-comparison", "distillation-pruning-quantization"])) {
    return taxonomy("model_optimization", "compression_strategy");
  }
  if (hasKey(card, ["hardware-aware-model-optimization"])) return taxonomy("model_optimization", "hardware_aware_optimization");

  if (hasKey(card, ["rag-end-to-end-flow"])) return taxonomy("rag_systems", "architecture");
  if (hasKey(card, [
    "rag-ingestion-modes",
    "rag-parsing-cleaning",
    "rag-chunking-purpose-tradeoff",
    "rag-chunking-strategies",
    "rag-chunk-overlap",
    "rag-metadata-importance",
  ])) return taxonomy("rag_systems", "ingestion_and_chunking");
  if (hasKey(card, [
    "rag-embedding-input-design",
    "dense-sparse-hybrid-retrieval",
    "vector-db-search-index",
    "ann-hnsw-ivf-pq",
  ])) return taxonomy("rag_systems", "embeddings_and_indexing");
  if (hasKey(card, ["rag-query-routing", "rag-query-rewriting", "rag-query-document-embedding-compatibility"])) {
    return taxonomy("rag_systems", "query_processing");
  }
  if (hasKey(card, ["retrieval-recall-reranking-precision", "rag-permission-filtering", "bi-encoder-cross-encoder"])) {
    return taxonomy("rag_systems", "retrieval_and_reranking");
  }
  if (hasKey(card, ["rag-context-selection", "rag-grounded-generation-citations"])) return taxonomy("rag_systems", "context_and_generation");
  if (hasKey(card, [
    "rag-monitoring-vs-evaluation",
    "rag-retrieval-evaluation-metrics",
    "rag-generation-evaluation",
    "rag-end-to-end-evaluation",
    "rag-debugging-failure-source",
  ])) return taxonomy("rag_systems", "evaluation_and_observability");

  if (hasKey(card, ["transactional-vs-analytical-databases", "row-vs-column-storage", "warehouse-vs-data-lake"])) {
    return taxonomy("ml_data_infrastructure", "databases_and_storage");
  }
  if (hasKey(card, ["user-vs-system-generated-data"])) return taxonomy("ml_data_infrastructure", "data_sources");
  if (hasKey(card, ["serialization-formats-for-ml-data"])) return taxonomy("ml_data_infrastructure", "data_formats");
  if (hasKey(card, ["etl-vs-elt", "batch-vs-stream-processing"])) return taxonomy("ml_data_infrastructure", "data_processing_patterns");

  if (hasKey(card, ["experiment-tracking-and-versioning"])) return taxonomy("training_infrastructure", "experiment_management");
  if (hasKey(card, ["data-vs-model-parallelism", "pipeline-parallelism"])) return taxonomy("training_infrastructure", "distributed_training");
  if (hasKey(card, ["batch-vs-online-predictions"])) return taxonomy("model_serving", "batch_and_online_inference");
  if (hasKey(card, ["online-vs-streaming-features"])) return taxonomy("model_serving", "feature_serving");
  if (hasKey(card, ["reduce-inference-latency"])) return taxonomy("model_serving", "inference_performance");
  if (hasKey(card, ["cloud-vs-edge-inference"])) return taxonomy("model_deployment", "deployment_topologies");

  if (hasKey(card, ["covariate-label-concept-shift", "detecting-distribution-shift"])) return taxonomy("production_ml", "data_drift");
  if (hasKey(card, ["monitoring-vs-observability", "ml-monitoring-metrics", "prediction-request-logging", "actionable-alert-design"])) {
    return taxonomy("production_ml", "monitoring_and_observability");
  }
  if (hasKey(card, ["stateless-vs-stateful-retraining", "continual-learning-challenges", "continual-learning-pipeline-stages", "choosing-retraining-frequency"])) {
    return taxonomy("production_ml", "retraining_and_continual_learning");
  }
  if (hasKey(card, ["ml-platform-responsibilities"])) return taxonomy("ml_platforms", "platform_architecture");

  if (hasKey(card, ["vllm-core-optimizations", "throughput-vs-latency"])) return taxonomy("llm_inference", "serving_fundamentals");
  if (hasKey(card, ["prefill-vs-decode"])) return taxonomy("llm_inference", "request_lifecycle");
  if (hasKey(card, ["kv-cache-purpose", "paged-attention-memory-allocation", "vllm-reserved-kv-memory", "kv-cache-preemption", "diagnose-unused-kv-cache"])) {
    return taxonomy("llm_inference", "kv_cache_and_memory");
  }
  if (hasKey(card, ["continuous-batching-mechanism", "chunked-prefill-purpose", "vllm-scheduler-iteration", "waiting-vs-running-scheduler-state", "max-num-seqs-vs-batched-tokens"])) {
    return taxonomy("llm_inference", "scheduling_and_batching");
  }
  if (hasKey(card, ["tensor-parallelism-mechanism", "parallelism-strategies-comparison", "pipeline-bubble-microbatching"])) {
    return taxonomy("llm_inference", "parallelism");
  }
  if (hasKey(card, ["prefix-caching-effect", "speculative-decoding-mechanism", "speculative-decoding-concurrency-tradeoff", "quantization-inference-tradeoff", "cuda-graphs-decoding"])) {
    return taxonomy("llm_inference", "inference_optimizations");
  }
  if (hasKey(card, ["architecture-affects-inference-performance", "prefill-compute-vs-decode-memory-bound"])) {
    return taxonomy("llm_inference", "performance_characteristics");
  }
  if (hasKey(card, ["ttft-vs-tpot", "concurrency-throughput-saturation", "prompt-length-ttft", "benchmarking-vllm-workloads", "production-llm-serving-metrics"])) {
    return taxonomy("llm_inference", "benchmarking_and_observability");
  }

  return null;
}

function classifyProgramming(card) {
  const key = card.cardKey;

  if (hasKey(card, ["builtin-vs-pandas-vs-python-udf", "pandas-udf-tradeoffs"])) return taxonomy("pyspark", "user_defined_functions");
  if (hasKey(card, ["window-functions-vs-groupby", "row-number-vs-rank"])) return taxonomy("pyspark", "window_functions");
  if (hasKey(card, ["common-pyspark-transformations"])) return taxonomy("pyspark", "dataframe_api");
  if (hasKey(card, ["conv-output-shape", "anchor-detector-output-shapes", "tiny-unet-shape-flow", "segmentation-cross-entropy-shapes"])) {
    return taxonomy("pytorch", "computer_vision_implementation");
  }
  if (hasKey(card, ["pytorch-from-numpy-vs-tensor", "pytorch-tensor-generation", "pytorch-tensor-shape-dtype-device"])) {
    return taxonomy("pytorch", "tensor_creation_and_attributes");
  }
  if (hasKey(card, [
    "pytorch-basic-indexing-and-ellipsis",
    "boolean-masking-vs-slicing",
    "pytorch-index-tensor-lookup",
    "pytorch-indexing-modes",
  ])) return taxonomy("pytorch", "indexing");
  if (hasKey(card, [
    "pytorch-cat-vs-stack",
    "pytorch-hstack-vstack",
    "pytorch-permute-dimensions",
    "pytorch-view-vs-reshape",
    "reshape-negative-one-inference",
    "pytorch-sum-keepdim",
    "pytorch-broadcasting-rules",
    "squeeze-unsqueeze-flatten",
    "zero-dimensional-tensor-and-item",
  ])) return taxonomy("pytorch", "tensor_operations");
  if (hasKey(card, ["pytorch-custom-dataset-contract", "batch-dimension-and-dataloader"])) return taxonomy("pytorch", "data_loading");
  if (hasKey(card, ["parameters-vs-named-parameters"])) return taxonomy("pytorch", "model_introspection");
  if (hasKey(card, ["pytorch-inplace-autograd-risk"])) return taxonomy("pytorch", "autograd");

  return null;
}

function classifySoftwareSystems(card) {
  const key = card.cardKey;

  if (hasKey(card, ["spark-work-hierarchy", "driver-executor-partition-roles", "lazy-evaluation-transformations-actions", "lineage-and-dag"])) {
    return taxonomy("apache_spark", "execution_model");
  }
  if (hasKey(card, ["variable-assignment-vs-cache", "cache-vs-persist"])) return taxonomy("apache_spark", "caching_and_materialization");
  if (hasKey(card, [
    "shuffle-mechanism",
    "why-distinct-orderby-shuffle",
    "repartition-vs-coalesce",
    "repartition-by-key-skew",
    "data-skew-diagnosis",
    "salting-hot-keys",
    "preaggregation-before-shuffle",
    "under-vs-over-partitioning",
    "choosing-partition-count",
  ])) return taxonomy("apache_spark", "shuffle_partitioning_and_skew");
  if (hasKey(card, ["broadcast-vs-shuffle-join", "sort-merge-join-mechanism", "spark-join-strategy-selection"])) {
    return taxonomy("apache_spark", "join_processing");
  }
  if (hasKey(card, ["aqe-capabilities"])) return taxonomy("apache_spark", "adaptive_query_execution");
  if (hasKey(card, ["partition-pruning-vs-predicate-pushdown", "logical-vs-physical-plan", "physical-plan-operator-signals"])) {
    return taxonomy("apache_spark", "query_optimization");
  }
  if (hasKey(card, ["spark-spill", "oom-root-cause-analysis", "cores-per-executor-tradeoff", "shuffle-partition-tuning"])) {
    return taxonomy("apache_spark", "memory_and_resource_tuning");
  }
  if (hasKey(card, ["spark-ui-debugging-flow", "end-to-end-spark-slow-job-debugging"])) return taxonomy("apache_spark", "performance_debugging");
  if (hasKey(card, ["parquet-vs-csv", "runtime-vs-storage-partition", "small-file-problem"])) return taxonomy("apache_spark", "data_layout_and_file_formats");
  if (hasKey(card, ["spark-fault-tolerance"])) return taxonomy("apache_spark", "fault_tolerance");

  if (hasKey(card, ["serialization-and-broadcast-variables"])) return taxonomy("distributed_systems", "data_serialization");
  if (hasKey(card, ["service-database-broker-communication"])) return taxonomy("distributed_systems", "inter_process_communication");
  if (hasKey(card, ["pubsub-vs-message-queue"])) return taxonomy("distributed_systems", "messaging");
  if (hasKey(card, ["docker-image-container-flow"])) return taxonomy("infrastructure", "containers");
  if (hasKey(card, ["orchestration-vs-workflow-scheduling"])) return taxonomy("infrastructure", "orchestration_and_workflows");

  return null;
}

function classify(card) {
  const classifiers = {
    machine_learning: classifyMachineLearning,
    math_statistics: classifyMathStatistics,
    ml_systems: classifyMlSystems,
    programming: classifyProgramming,
    software_systems: classifySoftwareSystems,
  };
  return classifiers[card.category]?.(card) ?? null;
}

function buildVocabulary(mappings) {
  const vocabulary = {};
  for (const mapping of mappings) {
    const topics = (vocabulary[mapping.category] ??= {});
    const subtopics = (topics[mapping.newTopic] ??= new Set());
    subtopics.add(mapping.newSubtopic);
  }
  return Object.fromEntries(
    Object.entries(vocabulary).sort(([a], [b]) => a.localeCompare(b)).map(([category, topics]) => [
      category,
      Object.fromEntries(
        Object.entries(topics).sort(([a], [b]) => a.localeCompare(b)).map(([topic, subtopics]) => [
          topic,
          [...subtopics].sort(),
        ]),
      ),
    ]),
  );
}

const response = await fetch(API_URL);
if (!response.ok) throw new Error(`Unable to fetch flashcards: ${response.status} ${response.statusText}`);

const cards = await response.json();
if (!Array.isArray(cards)) throw new Error("Expected the flashcards API to return an array.");

const unclassified = [];
const mappings = cards.map((card) => {
  const classification = classify(card);
  if (!classification) {
    unclassified.push(`${card.cardKey} (${card.category}: ${card.topic})`);
    return null;
  }
  return {
    cardKey: card.cardKey,
    category: card.category,
    oldTopic: card.topic,
    newTopic: classification.newTopic,
    newSubtopic: classification.newSubtopic,
    front: card.front,
    sourceReference: card.sourceReference,
    ...(classification.reviewNote ? { reviewNote: classification.reviewNote } : {}),
  };
});

if (unclassified.length > 0) {
  throw new Error(`Unclassified cards (${unclassified.length}):\n${unclassified.join("\n")}`);
}

mappings.sort((a, b) => a.category.localeCompare(b.category) || a.newTopic.localeCompare(b.newTopic) || a.newSubtopic.localeCompare(b.newSubtopic) || a.cardKey.localeCompare(b.cardKey));

const output = {
  metadata: {
    status: "proposed_for_review",
    generatedAt: new Date().toISOString(),
    source: API_URL,
    cardCount: mappings.length,
    notes: [
      "This file is a review artifact only; it has not been applied to Turso or the application.",
      "oldTopic is the current production value. newTopic and newSubtopic are proposed controlled values.",
      "cardKey is the stable identity that should be used by a future migration.",
    ],
  },
  vocabulary: buildVocabulary(mappings),
  mappings,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Wrote ${mappings.length} mappings to ${OUTPUT_PATH}`);
