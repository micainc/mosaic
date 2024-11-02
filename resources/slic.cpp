#include <string>
#include <iostream>

// Compile
// Windows: g++ slic.cpp -o slic_win.exe
// Mac: g++ slic.cpp -o slic_mac
// Linux: g++ slic.cpp -o slic_linux

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "No input string provided" << std::endl;
        return 1;
    }
    
    std::string input = argv[1];
    std::string modified = input + " MODIFIED";
    
    // Write to stdout
    std::cout << modified << std::endl;
    
    return 0;
}