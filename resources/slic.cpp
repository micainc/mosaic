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

struct Pixel {
    uint8_t r, g, b;
};

struct Center {
    float y, x;      // spatial coordinates
    float r, g, b;   // color values
};

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

// This is where the memory leak happens - when initializing this data structure
class SLIC {
private:
    const ImageMatrix &image; 
    std::vector<std::vector<int>> labels;
    std::vector<std::vector<float>> distances;
    std::vector<Center> centers;
    int n_segments;
    float compactness;
    int grid_step;
    
    float computeDistance(const Center& center, int x, int y) const {
        const Pixel& pixel = image(x, y);
        
        // Color distance
        float color_dist = std::sqrt(
            std::pow(pixel.r - center.r, 2) +
            std::pow(pixel.g - center.g, 2) +
            std::pow(pixel.b - center.b, 2)
        );
        
        // Spatial distance
        float spatial_dist = std::sqrt(
            std::pow(y - center.y, 2) +
            std::pow(x - center.x, 2)
        );
        
        return color_dist + (compactness / grid_step) * spatial_dist;
    }
    
    void initializeCenters() {
        centers.clear();
        // Initialize cluster centers on a regular grid
        for (int y = grid_step/2; y < image.height(); y += grid_step) {
            for (int x = grid_step/2; x < image.width(); x += grid_step) {
                if (y >= image.height() || x >= image.width()) continue;
                
                const Pixel& pixel = image(x, y);
                Center center = {
                    static_cast<float>(y),
                    static_cast<float>(x),
                    static_cast<float>(pixel.r),
                    static_cast<float>(pixel.g),
                    static_cast<float>(pixel.b)
                };
                centers.push_back(center);
            }
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
                new_centers[label].y += y;
                new_centers[label].x += x;
                new_centers[label].r += pixel.r;
                new_centers[label].g += pixel.g;
                new_centers[label].b += pixel.b;
                cluster_sizes[label]++;
            }
        }
        
        // Compute averages
        for (size_t i = 0; i < centers.size(); ++i) {
            if (cluster_sizes[i] > 0) {
                float size = static_cast<float>(cluster_sizes[i]);
                new_centers[i].y /= size;
                new_centers[i].x /= size;
                new_centers[i].r /= size;
                new_centers[i].g /= size;
                new_centers[i].b /= size;
            } else {
                new_centers[i] = centers[i];  // Keep old center if cluster is empty
            }
        }
        
        centers = std::move(new_centers);
    }

    void enforceConnectivity(int min_size = 25) {
        std::vector<std::vector<bool>> visited(image.height(), std::vector<bool>(image.width(), false));
        std::vector<std::vector<int>> new_labels = labels; // Copy current labels
        
        // First pass: find all segments and their sizes
        struct Segment {
            int label;
            int size;
            std::vector<std::pair<int,int>> pixels;
        };
        std::map<int, Segment> segments;

        // Find connected components for each original label
        for(int y = 0; y < image.height(); y++) {
            for(int x = 0; x < image.width(); x++) {
                if(visited[y][x]) continue;
                
                int originalLabel = labels[y][x];
                int size = 0;
                std::vector<std::pair<int,int>> component;
                
                // BFS to find connected component
                std::queue<std::pair<int,int>> q;
                q.push({y,x});
                
                while(!q.empty()) {
                    auto [cy, cx] = q.front();
                    q.pop();
                    
                    if(cy < 0 || cy >= image.height() || cx < 0 || cx >= image.width()) continue;
                    if(visited[cy][cx] || labels[cy][cx] != originalLabel) continue;
                    
                    visited[cy][cx] = true;
                    size++;
                    component.push_back({cy,cx});
                    
                    // Add 4-connected neighbors
                    q.push({cy+1, cx});
                    q.push({cy-1, cx});
                    q.push({cy, cx+1});
                    q.push({cy, cx-1});
                }
                
                if(size > 0) {
                    segments[originalLabel].label = originalLabel;
                    segments[originalLabel].size = size;
                    segments[originalLabel].pixels = component;
                }
            }
        }

        // Second pass: merge small segments
        for(const auto& segment : segments) {
            if(segment.second.size < min_size) {
                // Find neighboring segments
                std::map<int, int> neighborCounts;
                
                for(const auto& pixel : segment.second.pixels) {
                    int y = pixel.first;
                    int x = pixel.second;
                    
                    // Check 4-connected neighbors
                    std::vector<std::pair<int,int>> dirs = {{1,0}, {-1,0}, {0,1}, {0,-1}};
                    for(const auto& [dy, dx] : dirs) {
                        int ny = y + dy;
                        int nx = x + dx;
                        
                        if(ny < 0 || ny >= image.height() || nx < 0 || nx >= image.width()) continue;
                        int neighborLabel = labels[ny][nx];
                        if(neighborLabel != segment.first) {
                            neighborCounts[neighborLabel]++;
                        }
                    }
                }
                
                // Find most frequent neighbor
                int bestNeighbor = segment.first;
                int maxCount = 0;
                for(const auto& [label, count] : neighborCounts) {
                    if(count > maxCount) {
                        maxCount = count;
                        bestNeighbor = label;
                    }
                }
                
                // Merge with best neighbor
                for(const auto& pixel : segment.second.pixels) {
                    new_labels[pixel.first][pixel.second] = bestNeighbor;
                }
            }
        }
        
        labels = std::move(new_labels);
    }

public:
    SLIC(const ImageMatrix& img, int num_segments, float compact = 10.0)
        : image(img), 
          n_segments(num_segments),
          compactness(compact),
          labels(img.height(), std::vector<int>(img.width(), -1)),
          distances(img.height(), std::vector<float>(img.width(), std::numeric_limits<float>::max()))
    {
        int num_pixels = img.height() * img.width();

        // Ensure we don't request more segments than pixels
        n_segments = std::min(n_segments, num_pixels);
        // Ensure grid_step is atleast 1 to avoid infinite loops
        grid_step = std::max(1, static_cast<int>(std::sqrt(num_pixels / static_cast<float>(n_segments))));

        initializeCenters();
    }
    
    std::vector<std::vector<int>> compute(int max_iter = 10) {
        // TODO: Convert to LAB or HSV color space for better results
        
        for (int iter = 0; iter < max_iter; ++iter) {
            // Reset distances
            for (auto& row : distances) {
                std::fill(row.begin(), row.end(), std::numeric_limits<float>::max());
            }
            
            // Assign pixels to nearest center
            for (size_t i = 0; i < centers.size(); ++i) {
                const Center& center = centers[i];
                
                // Get search region boundaries
                int y_min = std::max(0, static_cast<int>(center.y - grid_step));
                int y_max = std::min(image.height(), static_cast<int>(center.y + grid_step));
                int x_min = std::max(0, static_cast<int>(center.x - grid_step));
                int x_max = std::min(image.width(), static_cast<int>(center.x + grid_step));
                
                // Search in 2S × 2S region
                for (int y = y_min; y < y_max; ++y) {
                    for (int x = x_min; x < x_max; ++x) {
                        float d = computeDistance(center, x, y);
                        if (d < distances[y][x]) {
                            distances[y][x] = d;
                            labels[y][x] = i;
                        }
                    }
                }
            }
            
            // Update centers
            updateCenters();
        }

        enforceConnectivity(25);
        
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
    SLIC slic(pixels, 40, 20);  // Create 100 superpixels
    auto labels = slic.compute(10);  // Run for 10 iterations
    
    // Output results
    std::cout << height << " " << width << "\n";
    for (const auto& row : labels) {
        for (size_t i = 0; i < row.size(); ++i) {
            std::cout << row[i];
            if (i < row.size() - 1) std::cout << " ";
        }
        std::cout << "\n";
    }
    
    std::cout << "sup\n";
    
    return 0;
}