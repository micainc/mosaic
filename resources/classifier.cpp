#include <onnxruntime/core/session/onnxruntime_cxx_api.h>

int main() {
    // Initialize environment
    Ort::Env env(ORT_LOGGING_LEVEL_WARNING);
    Ort::SessionOptions session_options;
    Ort::Session session(env, "model.onnx", session_options);
    
    // Set up input and output names
    Ort::AllocatorWithDefaultOptions allocator;
    const char* input_name = session.GetInputName(0, allocator);
    const char* output_name = session.GetOutputName(0, allocator);
    
    // Create input tensor
    std::vector<float> input_data = {...};  // Your input data
    std::vector<int64_t> input_shape = {1, 28, 28, 1};  // Example shape
    
    Ort::MemoryInfo memory_info = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
    Ort::Value input_tensor = Ort::Value::CreateTensor<float>(
        memory_info, input_data.data(), input_data.size(), 
        input_shape.data(), input_shape.size());
    
    // Run inference
    auto output_tensors = session.Run(
        Ort::RunOptions{nullptr}, 
        &input_name, &input_tensor, 1, 
        &output_name, 1);
    
    // Process output
    float* output_data = output_tensors[0].GetTensorMutableData<float>();
    
    return 0;
}