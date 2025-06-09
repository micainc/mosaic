#include <iostream>
#include <vector>
#include <sstream>
#include <cassert>







// int main(int argc, char *argv[]) {
//     if (argc < 2) {
//         std::cerr << "Usage: " << argv[0] << " \"width height\"" << std::endl;
//         return 1;
//     }

// #ifdef _WIN32
//     freopen(NULL, "rb", stdin);  // ensure binary mode on Windows
// #endif

//     // Parse width and height
//     std::istringstream iss(argv[1]);
//     int width, height;
//     iss >> width >> height;

//     const int channels = 15;  // 5 images × 3 channels (RGB)
//     const int total_pixels = width * height * channels;

//     // Read pixel data from stdin
//     std::vector<uint8_t> buffer(total_pixels);
//     std::cin.read(reinterpret_cast<char*>(buffer.data()), buffer.size());

//     if (std::cin.gcount() != buffer.size()) {
//         std::cerr << "Error: Incomplete pixel data received" << std::endl;
//         return 1;
//     }

//     // Normalize input (uint8 → float, 0-1 range)
//     std::vector<float> input_data;
//     input_data.reserve(total_pixels);
//     for (uint8_t val : buffer) {
//         input_data.push_back(static_cast<float>(val) / 255.0f);
//     }

//     try {
//         // Initialize ONNX Runtime
//         Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "test");
//         Ort::SessionOptions session_options;
        
//         // Convert path to wide string for Windows
// #ifdef _WIN32
//         std::wstring model_path = L"../models/model.onnx";
//         Ort::Session session(env, model_path.c_str(), session_options);
// #else
//         Ort::Session session(env, "../models/model.onnx", session_options);
// #endif

//         // Get input names using updated API
//         auto input_names = session.GetInputNames();
//         if (input_names.empty()) {
//             std::cerr << "Error: No input names found" << std::endl;
//             return 1;
//         }
//         const char* input_name = input_names[0].get();

//         // Get input type info
//         Ort::TypeInfo input_type_info = session.GetInputTypeInfo(0);
//         auto tensor_info = input_type_info.GetTensorTypeAndShapeInfo();
//         auto expected_shape = tensor_info.GetShape();

//         // Validate model input format
//         if (expected_shape.size() != 4 || expected_shape[1] != channels ||
//             expected_shape[2] != height || expected_shape[3] != width) {
//             std::cerr << "Model input shape mismatch. Expected: [1, "
//                       << channels << ", " << height << ", " << width << "]" << std::endl;
//             return 1;
//         }

//         // Prepare input tensor
//         Ort::MemoryInfo memory_info = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
//         Ort::Value input_tensor = Ort::Value::CreateTensor<float>(
//             memory_info, input_data.data(), input_data.size(),
//             expected_shape.data(), expected_shape.size());

//         // Get output names using updated API
//         auto output_names = session.GetOutputNames();
//         if (output_names.empty()) {
//             std::cerr << "Error: No output names found" << std::endl;
//             return 1;
//         }
//         const char* output_name = output_names[0].get();

//         // Prepare input/output arrays for Run method
//         std::vector<const char*> input_name_ptrs = {input_name};
//         std::vector<const char*> output_name_ptrs = {output_name};
//         std::vector<Ort::Value> input_tensors;
//         input_tensors.push_back(std::move(input_tensor));

//         // Run inference
//         auto output_tensors = session.Run(
//             Ort::RunOptions{nullptr},
//             input_name_ptrs.data(), 
//             input_tensors.data(), 
//             1,
//             output_name_ptrs.data(), 
//             1);

//         // Get output data
//         float* output_data = output_tensors[0].GetTensorMutableData<float>();
//         size_t output_len = output_tensors[0].GetTensorTypeAndShapeInfo().GetElementCount();

//         // Write raw float output to stdout
//         std::cout.write(reinterpret_cast<char*>(output_data), sizeof(float) * output_len);
        
//     } catch (const Ort::Exception& e) {
//         std::cerr << "ONNX Runtime error: " << e.what() << std::endl;
//         return 1;
//     } catch (const std::exception& e) {
//         std::cerr << "Error: " << e.what() << std::endl;
//         return 1;
//     }

//     return 0;
// }


// #include <iostream>
// #include <vector>
// #include <sstream>
// #include <cassert>
// // #include <onnxruntime/core/session/onnxruntime_cxx_api.h>
// #include <onnxruntime_cxx_api.h>

// int main(int argc, char *argv[]) {
//     if (argc < 2) {
//         std::cerr << "Usage: " << argv[0] << " \"width height\"" << std::endl;
//         return 1;
//     }

// #ifdef _WIN32
//     freopen(NULL, "rb", stdin);  // ensure binary mode on Windows
// #endif

//     // Parse width and height
//     std::istringstream iss(argv[1]);
//     int width, height;
//     iss >> width >> height;

//     const int channels = 15;  // 5 images × 3 channels (RGB)
//     const int total_pixels = width * height * channels;

//     // Read pixel data from stdin
//     std::vector<uint8_t> buffer(total_pixels);
//     std::cin.read(reinterpret_cast<char*>(buffer.data()), buffer.size());

//     if (std::cin.gcount() != buffer.size()) {
//         std::cerr << "Error: Incomplete pixel data received" << std::endl;
//         return 1;
//     }

//     // Normalize input (uint8 → float, 0-1 range)
//     std::vector<float> input_data;
//     input_data.reserve(total_pixels);
//     for (uint8_t val : buffer) {
//         input_data.push_back(static_cast<float>(val) / 255.0f);
//     }

//     // Initialize ONNX Runtime
//     Ort::Env env(ORT_LOGGING_LEVEL_WARNING);
//     Ort::SessionOptions session_options;
//     Ort::Session session(env, "../models/model.onnx", session_options);

//     // Validate expected input shape
//     Ort::AllocatorWithDefaultOptions allocator;
//     const char* input_name = session.GetInputName(0, allocator);
//     Ort::TypeInfo input_type_info = session.GetInputTypeInfo(0);
//     auto tensor_info = input_type_info.GetTensorTypeAndShapeInfo();
//     auto expected_shape = tensor_info.GetShape();

//     // Validate model input format
//     if (expected_shape.size() != 4 || expected_shape[1] != channels ||
//         expected_shape[2] != height || expected_shape[3] != width) {
//         std::cerr << "Model input shape mismatch. Expected: [1, "
//                   << channels << ", " << height << ", " << width << "]" << std::endl;
//         return 1;
//     }

//     // Prepare input tensor
//     Ort::MemoryInfo memory_info = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
//     Ort::Value input_tensor = Ort::Value::CreateTensor<float>(
//         memory_info, input_data.data(), input_data.size(),
//         expected_shape.data(), expected_shape.size());

//     // Get output name
//     const char* output_name = session.GetOutputName(0, allocator);

//     // Run inference
//     auto output_tensors = session.Run(
//         Ort::RunOptions{nullptr},
//         &input_name, &input_tensor, 1,
//         &output_name, 1);

//     // Get output data
//     float* output_data = output_tensors[0].GetTensorMutableData<float>();
//     size_t output_len = output_tensors[0].GetTensorTypeAndShapeInfo().GetElementCount();

//     // Write raw float output to stdout
//     std::cout.write(reinterpret_cast<char*>(output_data), sizeof(float) * output_len);
//     return 0;
// }
