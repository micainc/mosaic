#include <vector>
#include <string>
#include <iostream>
#include <sstream>

struct Pixel {
    uint8_t r, g, b;
};

class ImageMatrix {
private:
    std::vector<Pixel> data;
    int width_;
    int height_;

public:
    ImageMatrix(int width, int height) 
        : data(width * height), width_(width), height_(height) {}
    
    // Bounds-checked access
    Pixel& at(int x, int y) {
        if (x < 0 || x >= width_ || y < 0 || y >= height_) {
            throw std::out_of_range("Pixel coordinates out of bounds");
        }
        return data[y * width_ + x];
    }
    
    // Unchecked access for better performance when bounds are known
    Pixel& operator()(int x, int y) {
        return data[y * width_ + x];
    }
    
    // Getters
    int width() const { return width_; }
    int height() const { return height_; }
    
    // Raw data access for direct manipulation
    Pixel* raw_data() { return data.data(); }
    const Pixel* raw_data() const { return data.data(); }
};

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " \"width height [r g b] [r g b] ...\"" << std::endl;
        return 1;
    }
    
    std::istringstream iss(argv[1]);
    int width, height;
    iss >> width >> height;
    
    // Initialize matrix
    ImageMatrix pixels(width, height);
    
    // Read pixels
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            int r, g, b;
            iss >> r >> g >> b;
            pixels(x, y) = {static_cast<uint8_t>(r), 
                           static_cast<uint8_t>(g), 
                           static_cast<uint8_t>(b)};
        }
    }
    
    // Output the data
    std::cout << height << " " << width << "\n";
    for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
            const auto& pixel = pixels(x, y);
            std::cout << static_cast<int>(pixel.r) << " "
                     << static_cast<int>(pixel.g) << " "
                     << static_cast<int>(pixel.b);
            if (x < width - 1) std::cout << " ";
        }
        std::cout << "\n";
    }
    
    return 0;
}