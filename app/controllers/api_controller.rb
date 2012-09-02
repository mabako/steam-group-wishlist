require 'open-uri'

class ApiController < ApplicationController
  def show
    data = Rails.cache.fetch("wishlist_#{params[:id]}", :expires_in => 4.hours) do
      url = "http://steamcommunity.com/profiles/#{params[:id]}/wishlist?cc=us"
      doc = Nokogiri::HTML(open(url).read)
      
      # name display, with unicode derpness
      name = doc.search('h1').first.content
      items = doc.search('.wishlistRow')
      
      games = []
      items.each do |game|
        games << game.search('h4').first.content
      end
      
      [name, games]
    end

    respond_to do |format|
      format.json  { render :json => data }
    end
  end
end
