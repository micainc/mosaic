#include <vector>
#include <string>
#include <iostream>
#include <sstream>
#include <queue>
#include <map>
#include <cmath>
#include <limits>
#include <algorithm>
#include <cstdio> 
#include <fcntl.h>
#include <random>  

struct Pixel {
    uint8_t r, g, b;
};

// LAB color structure
struct LabColor {
    float l, a, b;
};

struct Center {
    float y, x;      // normalized spatial coordinates [0-1]
    float l, a, b;   // normalized LAB color values [0-1]
};

// RGB to LAB conversion utilities
inline float srgbToLinear(float c) {
    return c <= 0.04045f ? c / 12.92f : std::pow((c + 0.055f) / 1.055f, 2.4f);
}

inline void rgbToXyz(uint8_t r, uint8_t g, uint8_t b, float& x, float& y, float& z) {
    float rf = srgbToLinear(r / 255.0f);
    float gf = srgbToLinear(g / 255.0f);
    float bf = srgbToLinear(b / 255.0f);
    
    x = 0.4124564f * rf + 0.3575761f * gf + 0.1804375f * bf;
    y = 0.2126729f * rf + 0.7151522f * gf + 0.0721750f * bf;
    z = 0.0193339f * rf + 0.1191920f * gf + 0.9503041f * bf;
}

inline void xyzToLab(float x, float y, float z, float& l, float& a, float& b) {
    // D65 white point
    const float xn = 0.95047f;
    const float yn = 1.0f;
    const float zn = 1.08883f;
    
    x /= xn;
    y /= yn;
    z /= zn;
    
    auto f = [](float t) {
        return t > 0.008856f ? std::pow(t, 1.0f/3.0f) : (7.787f * t + 16.0f/116.0f);
    };
    
    float fx = f(x);
    float fy = f(y);
    float fz = f(z);
    
    l = y > 0.008856f ? (116.0f * std::pow(y, 1.0f/3.0f) - 16.0f) : (903.3f * y);
    a = 500.0f * (fx - fy);
    b = 200.0f * (fy - fz);
    
    // Normalize to [0-1]
    l /= 100.0f;                 // L is in [0, 100]
    a = (a + 128.0f) / 255.0f;   // a is roughly in [-128, 127]
    b = (b + 128.0f) / 255.0f;   // b is roughly in [-128, 127]
}

inline LabColor rgbToLab(uint8_t r, uint8_t g, uint8_t b) {
    float x, y, z;
    rgbToXyz(r, g, b, x, y, z);
    
    LabColor lab;
    xyzToLab(x, y, z, lab.l, lab.a, lab.b);
    return lab;
}

class ImageMatrix {
private:
    std::vector<Pixel> data;
    int width_;
    int height_;

public:
    ImageMatrix(int width, int height) 
        : data(width * height), width_(width), height_(height) {}
    
    Pixel& operator()(int x, int y) {
        return data[y * width_ + x];
    }
    
    const Pixel& operator()(int x, int y) const {
        return data[y * width_ + x];
    }
    
    int width() const { return width_; }
    int height() const { return height_; }
};

class SLIC {
private:
    const ImageMatrix &image; 
    std::vector<std::vector<int>> labels;
    std::vector<std::vector<float>> distances;
    std::vector<Center> centers;
    int n_segments;
    float compactness;
    float width_factor, height_factor;  // Factors for normalizing spatial coordinates
    
    float computeDistance(const Center& center, int x, int y) const {
        const Pixel& pixel = image(x, y);
        
        // Convert RGB to LAB
        LabColor lab = rgbToLab(pixel.r, pixel.g, pixel.b);
        
        // Normalize spatial coordinates
        float norm_x = x * width_factor;
        float norm_y = y * height_factor;
        
        // // Color distance (in normalized LAB space)
        // float color_dist = std::sqrt(
        //     std::pow(lab.l - center.l, 2) +
        //     std::pow(lab.a - center.a, 2) +
        //     std::pow(lab.b - center.b, 2)
        // );
        
        // // Spatial distance (in normalized coordinates)
        // float spatial_dist = std::sqrt(
        //     std::pow(norm_y - center.y, 2) +
        //     std::pow(norm_x - center.x, 2)
        // );
        
        float dist = std::sqrt(
            std::pow(lab.l - center.l, 2) +
            std::pow(lab.a - center.a, 2) +
            std::pow(lab.b - center.b, 2) +
            compactness*std::pow(norm_y - center.y, 2) +
            compactness*std::pow(norm_x - center.x, 2)
        );
        // Both components are now in similar ranges [0-1]
        // return color_dist + compactness * spatial_dist;
        return dist;
    }
    
    void initializeCenters() {
        centers.clear();
        
        // Use C++11 random number generator for better distribution
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<int> x_dist(0, image.width() - 1);
        std::uniform_int_distribution<int> y_dist(0, image.height() - 1);
        
        // Initialize n_segments random centers
        for (int i = 0; i < n_segments; i++) {
            // Generate random x,y coordinates
            int x = x_dist(gen);
            int y = y_dist(gen);
            
            const Pixel& pixel = image(x, y);
            
            // Convert RGB to normalized LAB
            LabColor lab = rgbToLab(pixel.r, pixel.g, pixel.b);
            
            // Normalize spatial coordinates
            float norm_y = y * height_factor;
            float norm_x = x * width_factor;
            
            Center center = {
                norm_y,
                norm_x,
                lab.l,
                lab.a,
                lab.b
            };
            centers.push_back(center);
        }
    }
        
    void updateCenters() {
        std::vector<Center> new_centers = centers;
        std::vector<int> cluster_sizes(centers.size(), 0);
        
        // Reset new centers
        for (auto& center : new_centers) {
            center = {0, 0, 0, 0, 0};
        }
        
        // Accumulate values
        for (int y = 0; y < image.height(); ++y) {
            for (int x = 0; x < image.width(); ++x) {
                int label = labels[y][x];
                if (label == -1) continue;
                
                const Pixel& pixel = image(x, y);
                
                // Convert RGB to LAB
                LabColor lab = rgbToLab(pixel.r, pixel.g, pixel.b);
                
                // Normalize spatial coordinates
                float norm_y = y * height_factor;
                float norm_x = x * width_factor;
                
                new_centers[label].y += norm_y;
                new_centers[label].x += norm_x;
                new_centers[label].l += lab.l;
                new_centers[label].a += lab.a;
                new_centers[label].b += lab.b;
                cluster_sizes[label]++;
            }
        }
        
        // Compute averages
        for (size_t i = 0; i < centers.size(); ++i) {
            if (cluster_sizes[i] > 0) {
                float size = static_cast<float>(cluster_sizes[i]);
                new_centers[i].y /= size;
                new_centers[i].x /= size;
                new_centers[i].l /= size;
                new_centers[i].a /= size;
                new_centers[i].b /= size;
            } else {
                new_centers[i] = centers[i];  // Keep old center if cluster is empty
            }
        }
        
        centers = std::move(new_centers);
    }

public:
    SLIC(const ImageMatrix& img, int num_segments, float compact = 1.0)
        : image(img), 
          n_segments(num_segments),
          compactness(compact),
          labels(img.height(), std::vector<int>(img.width(), -1)),
          distances(img.height(), std::vector<float>(img.width(), std::numeric_limits<float>::max()))
    {
        int num_pixels = img.height() * img.width();

        // LIMIT: Hard-code maximum of 256 clusters
        n_segments = std::min(std::min(num_segments, num_pixels), 256);

        // Normalization factors for spatial coordinates
        width_factor = 1.0f / img.width();
        height_factor = 1.0f / img.height();

        initializeCenters();
    }
    
    std::vector<std::vector<int>> compute(int max_iter = 10) {
        for (int iter = 0; iter < max_iter; ++iter) {
            // Reset distances
            for (auto& row : distances) {
                std::fill(row.begin(), row.end(), std::numeric_limits<float>::max());
            }
            
            // Assign pixels to nearest center (checking all centers for each pixel)
            for (int y = 0; y < image.height(); ++y) {
                for (int x = 0; x < image.width(); ++x) {
                    // Check every center for this pixel
                    for (size_t i = 0; i < centers.size(); ++i) {
                        const Center& center = centers[i];
                        float d = computeDistance(center, x, y);
                        if (d < distances[y][x]) {
                            distances[y][x] = d;
                            labels[y][x] = i;
                        }
                    }
                }
            }
            
            updateCenters();
        }
                
        return labels;
    }
};

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " \"width height\"" << std::endl;
        return 1;
    }

    #ifdef _WIN32
        freopen(NULL, "rb", stdin);
    #endif
        
    std::istringstream iss(argv[1]);
    int width, height;
    iss >> width >> height;
    
    // Initialize matrix
    ImageMatrix pixels(width, height);
    
    std::vector<uint8_t> buffer(width * height * 3);
    std::cin.read(reinterpret_cast<char*>(buffer.data()), buffer.size());

    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            size_t idx = (y * width + x) * 3;
            pixels(x, y) = {buffer[idx], buffer[idx+1], buffer[idx+2]};
        }
    }

    // Run SLIC
    SLIC slic(pixels, 16, 0.0); 
    auto labels = slic.compute(10);  // Run for 10 iterations
    

    // Output the labels directly as uint8 values
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            uint8_t label_val = static_cast<uint8_t>(labels[y][x]);
            std::cout.write(reinterpret_cast<const char*>(&label_val), sizeof(uint8_t));
        }
    }

    return 0;
}