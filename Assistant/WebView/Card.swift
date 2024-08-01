import SwiftUI

struct Card: View {
    var title: String
    var subTitle: String
    var deleting: Bool = false

    @Binding var selected: Bool
    
    var unselectedBackground: some View {
        Color.blue.opacity(0.2)
                .cornerRadius(8)
                .shadow(color: Color.blue, radius: 12, x: 0, y: 4)
    }
    
    var selectedBackground: some View {
        Color.green.opacity(0.3)
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.yellow, lineWidth: 2)
            )
            .shadow(color: Color.green, radius: 12, x: 0, y: 4)
    }
    
    var deletingBackground: some View {
        ZStack {
            Color.red.opacity(0.3)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.yellow, lineWidth: 2)
                )
                .shadow(color: Color.green, radius: 12, x: 0, y: 4)
            
            ProgressView()
        }
    }

    var body: some View {
        ZStack {
            if deleting {
                deletingBackground
            } else if (selected) {
                selectedBackground
            } else {
                unselectedBackground
            }

            VStack {
                Text(title)
                    .font(.largeTitle)
                    .padding(.bottom, 20)
                Text(subTitle)
                    .font(.subheadline)
            }
            .padding(.top, 8)
            .padding(.bottom, 8)
            .padding(.leading, 8)
            .padding(.trailing, 8)
        }
        .opacity(1)
        .onTapGesture {
            selected = true
        }
    }
}

struct Card_Previews: PreviewProvider {
    static var previews: some View {
        VStack {
            Card(
                title: "标题",
                subTitle: "副标题",
                selected: Binding.constant(false)
            )
            .frame(width: 150, height: 150)

            Card(
                title: "选中的",
                subTitle: "副标题",
                selected: Binding.constant(true)
            )
            .frame(width: 150, height: 150)
            
            Card(
                title: "删除中",
                subTitle: "副标题",
                deleting: true,
                selected: Binding.constant(true)
            )
            .frame(width: 150, height: 150)
        }.padding(.all, 24).background(Color.red.opacity(0.1))
    }
}
