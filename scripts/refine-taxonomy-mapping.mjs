import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAPPING_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../data/flashcard-taxonomy-mapping.json",
);

const TOPIC_CATALOG = {
  machine_learning: {
    tabular_supervised_models: "Linear, logistic, and gradient-boosted models for structured prediction.",
    clustering_methods: "Centroid, density-based, and hierarchical clustering methods.",
    neural_networks: "Neural-network components, optimization, normalization, and transfer methods.",
    computer_vision: "Vision architectures, task heads, detection, and segmentation.",
    data_and_features: "Feature transformation, text representation, data quality, and label strategy.",
    evaluation_and_decision_making: "Validation, metrics, calibration, uncertainty, and decision policies.",
  },
  math_statistics: {
    mathematical_foundations: "Linear algebra, differentiation, and convexity used in ML.",
    probability_and_descriptive_statistics: "Probability primitives, distributions, and descriptive association.",
    statistical_inference_and_experimentation: "Sampling, tests, model comparisons, metrics, and experiments.",
  },
  ml_systems: {
    data_and_training_platforms: "ML data architecture, feature pipelines, experiments, and distributed training.",
    model_efficiency: "Adaptation, compression, quantization, and hardware-aware model optimization.",
    deployment_and_production_ml: "Serving, rollout, monitoring, drift, and retraining workflows.",
    llm_inference: "LLM request execution, memory, scheduling, parallelism, and performance.",
    retrieval_augmented_generation: "RAG ingestion, indexing, retrieval, generation, and evaluation.",
  },
  programming: {
    pytorch: "PyTorch tensor, data, autograd, model, and vision APIs.",
  },
  software_systems: {
    apache_spark: "PySpark APIs plus Spark execution, storage, shuffle, query planning, and tuning.",
    distributed_infrastructure: "Data movement, process communication, containers, and orchestration.",
  },
};

const RULES = {
  machine_learning: {
    computer_vision: {
      convolutional_neural_networks: ["computer_vision", "vision_architectures_and_transfer"],
      vision_transformers: ["computer_vision", "vision_architectures_and_transfer"],
      vision_tasks_and_heads: ["computer_vision", "task_and_head_design"],
      object_detection: ["computer_vision", "object_detection"],
      image_segmentation: ["computer_vision", "image_segmentation"],
    },
    data_preparation: {
      feature_scaling: ["data_and_features", "numeric_features_and_scaling"],
      feature_interactions: ["data_and_features", "numeric_features_and_scaling"],
      text_features: ["data_and_features", "text_features_and_preprocessing"],
      text_preprocessing: ["data_and_features", "text_features_and_preprocessing"],
      missing_data: ["data_and_features", "data_quality_and_leakage"],
      data_leakage: ["data_and_features", "data_quality_and_leakage"],
      class_imbalance: ["data_and_features", "dataset_and_label_strategies"],
      data_augmentation: ["data_and_features", "dataset_and_label_strategies"],
      label_scarcity: ["data_and_features", "dataset_and_label_strategies"],
    },
    deep_learning: {
      activation_functions: ["neural_networks", "activations_and_losses"],
      loss_functions: ["neural_networks", "activations_and_losses"],
      normalization: ["neural_networks", "normalization"],
      positional_representations: ["neural_networks", "transformer_representations"],
      transfer_learning: ["neural_networks", "transfer_learning"],
    },
    model_evaluation: {
      classification_metrics: ["evaluation_and_decision_making", "metrics"],
      regression_metrics: ["evaluation_and_decision_making", "metrics"],
      evaluation_workflows: ["evaluation_and_decision_making", "validation_and_model_selection"],
      generalization_and_validation: ["evaluation_and_decision_making", "validation_and_model_selection"],
      model_selection: ["evaluation_and_decision_making", "validation_and_model_selection"],
      thresholds_calibration_and_uncertainty: ["evaluation_and_decision_making", "calibration_thresholds_and_uncertainty"],
    },
    optimization: {
      adaptive_optimizers: ["neural_networks", "optimization_algorithms"],
      gradient_based_optimization: ["neural_networks", "optimization_algorithms"],
      gradient_descent: ["neural_networks", "optimization_algorithms"],
      optimizer_selection: ["neural_networks", "optimization_algorithms"],
      second_order_methods: ["neural_networks", "optimization_algorithms"],
    },
    reinforcement_learning: {
      multi_armed_bandits: ["evaluation_and_decision_making", "decision_policies"],
    },
    supervised_learning: {
      linear_regression: ["tabular_supervised_models", "linear_regression"],
      logistic_regression: ["tabular_supervised_models", "logistic_regression"],
      gradient_boosting: ["tabular_supervised_models", "gradient_boosted_trees"],
    },
    unsupervised_learning: {
      k_means: ["clustering_methods", "k_means"],
      dbscan: ["clustering_methods", "density_based_clustering"],
      hierarchical_clustering: ["clustering_methods", "hierarchical_clustering"],
    },
  },
  math_statistics: {
    calculus: {
      convex_analysis: ["mathematical_foundations", "convexity_and_optimization"],
      differentiability: ["mathematical_foundations", "differentiation_and_backprop"],
      multivariable_differentiation: ["mathematical_foundations", "differentiation_and_backprop"],
    },
    descriptive_statistics: {
      summary_and_association: ["probability_and_descriptive_statistics", "descriptive_statistics_and_association"],
    },
    experimentation: {
      experimental_design: ["statistical_inference_and_experimentation", "experimental_design_and_power"],
    },
    linear_algebra: {
      covariance_matrices: ["mathematical_foundations", "matrices_and_covariance"],
      matrices_and_transformations: ["mathematical_foundations", "matrices_and_covariance"],
      vector_operations: ["mathematical_foundations", "vector_spaces_and_geometry"],
      vector_spaces: ["mathematical_foundations", "vector_spaces_and_geometry"],
    },
    model_evaluation: {
      classification_metrics: ["statistical_inference_and_experimentation", "model_evaluation_statistics"],
    },
    probability: {
      conditional_probability: ["probability_and_descriptive_statistics", "conditional_probability"],
      probability_distributions: ["probability_and_descriptive_statistics", "probability_distributions"],
      random_variables: ["probability_and_descriptive_statistics", "random_variables_and_expectation"],
    },
    statistical_inference: {
      hypothesis_testing: ["statistical_inference_and_experimentation", "hypothesis_testing"],
      model_comparison: ["statistical_inference_and_experimentation", "model_evaluation_statistics"],
      sampling_and_estimation: ["statistical_inference_and_experimentation", "sampling_and_estimation"],
    },
  },
  ml_systems: {
    llm_inference: {
      benchmarking_and_observability: ["llm_inference", "optimization_benchmarking_and_observability"],
      inference_optimizations: ["llm_inference", "optimization_benchmarking_and_observability"],
      kv_cache_and_memory: ["llm_inference", "kv_cache_and_memory"],
      parallelism: ["llm_inference", "parallelism"],
      performance_characteristics: ["llm_inference", "request_lifecycle_and_performance"],
      request_lifecycle: ["llm_inference", "request_lifecycle_and_performance"],
      scheduling_and_batching: ["llm_inference", "scheduling_and_batching"],
      serving_fundamentals: ["llm_inference", "request_lifecycle_and_performance"],
    },
    ml_data_infrastructure: {
      data_formats: ["data_and_training_platforms", "storage_sources_and_formats"],
      data_processing_patterns: ["data_and_training_platforms", "processing_and_feature_pipelines"],
      data_quality_and_leakage: ["data_and_training_platforms", "data_quality_and_point_in_time_correctness"],
      data_sources: ["data_and_training_platforms", "storage_sources_and_formats"],
      databases_and_storage: ["data_and_training_platforms", "storage_sources_and_formats"],
      feature_pipelines: ["data_and_training_platforms", "processing_and_feature_pipelines"],
    },
    ml_development: {
      data_centric_ai: ["data_and_training_platforms", "data_quality_and_point_in_time_correctness"],
    },
    ml_platforms: {
      platform_architecture: ["data_and_training_platforms", "platform_and_experiment_management"],
    },
    model_deployment: {
      deployment_topologies: ["deployment_and_production_ml", "deployment_topologies"],
      evaluation_and_rollouts: ["deployment_and_production_ml", "testing_and_rollouts"],
    },
    model_optimization: {
      compression_strategy: ["model_efficiency", "efficiency_strategy_and_hardware"],
      hardware_aware_optimization: ["model_efficiency", "efficiency_strategy_and_hardware"],
      knowledge_distillation: ["model_efficiency", "compression_methods"],
      parameter_efficient_finetuning: ["model_efficiency", "efficient_adaptation"],
      pruning: ["model_efficiency", "compression_methods"],
      quantization: ["model_efficiency", "quantization"],
    },
    model_serving: {
      batch_and_online_inference: ["deployment_and_production_ml", "serving_patterns_and_features"],
      batch_inference: ["deployment_and_production_ml", "serving_patterns_and_features"],
      feature_serving: ["deployment_and_production_ml", "serving_patterns_and_features"],
      inference_performance: ["deployment_and_production_ml", "deployment_topologies"],
    },
    production_ml: {
      data_drift: ["deployment_and_production_ml", "monitoring_observability_and_drift"],
      monitoring_and_observability: ["deployment_and_production_ml", "monitoring_observability_and_drift"],
      retraining_and_continual_learning: ["deployment_and_production_ml", "retraining_and_continual_learning"],
    },
    rag_systems: {
      architecture: ["retrieval_augmented_generation", "architecture_and_ingestion"],
      context_and_generation: ["retrieval_augmented_generation", "context_and_generation"],
      embeddings_and_indexing: ["retrieval_augmented_generation", "embeddings_and_indexing"],
      evaluation_and_observability: ["retrieval_augmented_generation", "evaluation_and_debugging"],
      ingestion_and_chunking: ["retrieval_augmented_generation", "architecture_and_ingestion"],
      query_processing: ["retrieval_augmented_generation", "query_retrieval_and_reranking"],
      retrieval_and_reranking: ["retrieval_augmented_generation", "query_retrieval_and_reranking"],
    },
    training_infrastructure: {
      distributed_training: ["data_and_training_platforms", "distributed_training_and_efficiency"],
      experiment_management: ["data_and_training_platforms", "platform_and_experiment_management"],
      training_efficiency: ["data_and_training_platforms", "distributed_training_and_efficiency"],
    },
  },
  programming: {
    pyspark: {
      dataframe_api: ["apache_spark", "pyspark_dataframe_api"],
      user_defined_functions: ["apache_spark", "udfs_and_window_functions"],
      window_functions: ["apache_spark", "udfs_and_window_functions"],
    },
    pytorch: {
      autograd: ["pytorch", "autograd_and_model_introspection"],
      computer_vision_implementation: ["pytorch", "vision_implementation"],
      data_loading: ["pytorch", "data_loading"],
      indexing: ["pytorch", "tensor_creation_indexing_and_attributes"],
      model_introspection: ["pytorch", "autograd_and_model_introspection"],
      tensor_creation_and_attributes: ["pytorch", "tensor_creation_indexing_and_attributes"],
      tensor_operations: ["pytorch", "tensor_shapes_and_operations"],
    },
  },
  software_systems: {
    apache_spark: {
      adaptive_query_execution: ["apache_spark", "query_planning_and_joins"],
      caching_and_materialization: ["apache_spark", "storage_and_caching"],
      data_layout_and_file_formats: ["apache_spark", "storage_and_caching"],
      execution_model: ["apache_spark", "execution_and_reliability"],
      fault_tolerance: ["apache_spark", "execution_and_reliability"],
      join_processing: ["apache_spark", "query_planning_and_joins"],
      memory_and_resource_tuning: ["apache_spark", "performance_tuning_and_debugging"],
      performance_debugging: ["apache_spark", "performance_tuning_and_debugging"],
      query_optimization: ["apache_spark", "query_planning_and_joins"],
      shuffle_partitioning_and_skew: ["apache_spark", "partitioning_and_shuffle"],
    },
    distributed_systems: {
      data_serialization: ["distributed_infrastructure", "serialization_and_data_movement"],
      inter_process_communication: ["distributed_infrastructure", "communication_and_messaging"],
      messaging: ["distributed_infrastructure", "communication_and_messaging"],
    },
    infrastructure: {
      containers: ["distributed_infrastructure", "deployment_and_orchestration"],
      orchestration_and_workflows: ["distributed_infrastructure", "deployment_and_orchestration"],
    },
  },
};

function fail(message) {
  throw new Error(message);
}

function buildVocabulary(mappings) {
  const vocabulary = {};
  for (const mapping of mappings) {
    const topics = (vocabulary[mapping.category] ??= {});
    const subtopics = (topics[mapping.newTopic] ??= new Set());
    subtopics.add(mapping.newSubtopic);
  }
  return Object.fromEntries(Object.entries(vocabulary).map(([category, topics]) => [
    category,
    Object.fromEntries(Object.entries(topics).map(([topic, subtopics]) => [topic, [...subtopics].sort()])),
  ]));
}

function validate(mappings, vocabulary, usedRules) {
  const keys = mappings.map((mapping) => mapping.cardKey);
  if (new Set(keys).size !== keys.length) fail("Every cardKey must appear exactly once");

  const declaredTopics = Object.values(TOPIC_CATALOG).flatMap((topics) => Object.keys(topics));
  const actualTopics = Object.values(vocabulary).flatMap((topics) => Object.keys(topics));
  if (new Set(declaredTopics).size !== 17 || new Set(actualTopics).size !== 17) {
    fail(`Expected exactly 17 topics; declared ${new Set(declaredTopics).size}, generated ${new Set(actualTopics).size}`);
  }

  for (const [category, topics] of Object.entries(vocabulary)) {
    const declared = TOPIC_CATALOG[category];
    if (!declared) fail(`Unknown category ${category}`);
    if (Object.keys(topics).length > 6) fail(`${category} exposes more than 6 topics`);
    for (const [topic, subtopics] of Object.entries(topics)) {
      if (!declared[topic]) fail(`Undeclared topic ${category}/${topic}`);
      if (subtopics.length < 3 || subtopics.length > 7) {
        fail(`${category}/${topic} must expose 3-7 subtopics; found ${subtopics.length}`);
      }
      const cardCount = mappings.filter((mapping) => mapping.category === category && mapping.newTopic === topic).length;
      if (cardCount < 5) fail(`${category}/${topic} has only ${cardCount} cards`);
    }
    for (const topic of Object.keys(declared)) {
      if (!topics[topic]) fail(`Declared topic ${category}/${topic} has no cards`);
    }
  }

  const definedRules = [];
  for (const [category, topics] of Object.entries(RULES)) {
    for (const [topic, subtopics] of Object.entries(topics)) {
      for (const subtopic of Object.keys(subtopics)) definedRules.push(`${category}/${topic}/${subtopic}`);
    }
  }
  const unusedRules = definedRules.filter((rule) => !usedRules.has(rule));
  if (unusedRules.length > 0) fail(`Unused taxonomy rules:\n${unusedRules.join("\n")}`);
}

const payload = JSON.parse(await readFile(MAPPING_PATH, "utf8"));
if (!Array.isArray(payload.mappings) || payload.mappings.length === 0) fail("Mapping file has no mappings");

const usedRules = new Set();
const mappings = payload.mappings.map((mapping) => {
  const ruleKey = `${mapping.category}/${mapping.newTopic}/${mapping.newSubtopic}`;
  const rule = RULES[mapping.category]?.[mapping.newTopic]?.[mapping.newSubtopic];
  if (!rule) fail(`No compact taxonomy rule for ${mapping.cardKey}: ${ruleKey}`);
  usedRules.add(ruleKey);
  const [newTopic, newSubtopic] = rule;
  return {
    ...mapping,
    category: mapping.category === "programming" && mapping.newTopic === "pyspark" ? "software_systems" : mapping.category,
    oldCategory: mapping.category,
    oldSubtopic: mapping.oldSubtopic ?? mapping.newSubtopic,
    newTopic,
    newSubtopic,
  };
});

mappings.sort((a, b) => a.category.localeCompare(b.category)
  || a.newTopic.localeCompare(b.newTopic)
  || a.newSubtopic.localeCompare(b.newSubtopic)
  || a.cardKey.localeCompare(b.cardKey));

const vocabulary = buildVocabulary(mappings);
validate(mappings, vocabulary, usedRules);

const output = {
  metadata: {
    ...payload.metadata,
    status: "compact_taxonomy_reviewed",
    refinedAt: new Date().toISOString(),
    topicCount: 17,
    constraints: {
      maxTopicsPerCategory: 6,
      minSubtopicsPerTopic: 3,
      maxSubtopicsPerTopic: 7,
      minCardsPerTopic: 5,
    },
    notes: [
      "Topics are bounded interview study areas; subtopics are dependent filters within a selected topic.",
      "Each card has exactly one category, topic, and subtopic based on its primary tested competency.",
      "oldTopic and oldSubtopic preserve the prior taxonomy for migration and audit purposes.",
    ],
  },
  topicCatalog: TOPIC_CATALOG,
  vocabulary,
  mappings,
};

await writeFile(MAPPING_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Refined ${mappings.length} cards into 17 topics.`);
